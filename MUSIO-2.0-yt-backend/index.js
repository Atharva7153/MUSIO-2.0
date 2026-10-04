// yt-server/index.js
import express from "express";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import PlaylistSchema from "./models/Playlist.js";
import SongSchema from "./models/Song.js";
import dotenv from "dotenv";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";

const execFileP = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from local directory first, then fallback to root .env.local / .env
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(cors());
app.use(express.json());
// Serve minimal UI from public/
app.use(express.static(path.join(__dirname, "public")));

// Helper: locate yt-dlp binary (checks ./bin, bundled node_modules, /usr/local/bin, /opt/homebrew/bin, then PATH)
function getYtDlpBinaryPath() {
  const binName = os.platform().startsWith("win") ? "yt-dlp.exe" : "yt-dlp";
  const candidates = [
    path.join(__dirname, "bin", binName),
    path.join(__dirname, "node_modules", "yt-dlp-exec", "bin", binName),
    "/usr/local/bin/yt-dlp",
    "/opt/homebrew/bin/yt-dlp",
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return binName;
}

// Helper: locate ffmpeg binary across macOS Homebrew and Linux paths
function getFfmpegBinaryPath() {
  if (os.platform().startsWith("win")) return "ffmpeg.exe";
  const candidates = [
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "ffmpeg";
}

// Helper: extract 11-char YouTube video ID and normalize URL
function extractYouTubeId(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id && /^[\w-]{11}$/.test(id)) return id;
    }
    const vParam = parsed.searchParams.get("v");
    if (vParam && /^[\w-]{11}$/.test(vParam)) return vParam;
    const pathMatch = parsed.pathname.match(
      /\/(?:shorts|embed|v|live)\/([\w-]{11})/
    );
    if (pathMatch) return pathMatch[1];
  } catch (_) {}
  const fallbackMatch = trimmed.match(
    /(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/
  );
  return fallbackMatch ? fallbackMatch[1] : null;
}

function normalizeYouTubeUrl(rawUrl) {
  const id = extractYouTubeId(rawUrl);
  return id ? `https://www.youtube.com/watch?v=${id}` : String(rawUrl).trim();
}

// Helper: copy cookies.txt to a temp file and strip IP-bound visitor tracking tokens that trigger HTTP 403
function createTempCookiesCopy() {
  const cookiePath = process.env.YT_COOKIES_PATH || "./cookies.txt";
  const resolved = path.resolve(__dirname, cookiePath);
  if (!fs.existsSync(resolved)) return null;

  const rawContent = fs.readFileSync(resolved, "utf8");
  const blockedCookieNames = new Set([
    "VISITOR_INFO1_LIVE",
    "VISITOR_PRIVACY_METADATA",
    "GPS",
    "__Secure-ROLLOUT_TOKEN",
    "DEVICE_INFO",
    "YSC",
  ]);

  const cleanedLines = rawContent.split(/\r?\n/).filter((line) => {
    if (!line.trim() || line.startsWith("#")) return true;
    const parts = line.split("\t");
    const cookieName = parts[5]?.trim();
    return !blockedCookieNames.has(cookieName);
  });

  const tempPath = path.join(
    os.tmpdir(),
    `yt-cookies-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
  );
  fs.writeFileSync(tempPath, cleanedLines.join("\n") + "\n", "utf8");
  return tempPath;
}

async function runYtDlpCli(url, { output, format, cookies, extraArgs } = {}) {
  const bin = getYtDlpBinaryPath();
  const args = [url];
  if (output) {
    args.push("--output", output);
  }
  if (format) {
    args.push("--format", format);
  }
  if (cookies) {
    args.push("--cookies", cookies);
  }
  if (Array.isArray(extraArgs) && extraArgs.length) {
    args.push(...extraArgs);
  }
  args.push(
    "--js-runtimes",
    `node:${process.execPath}`,
    "--geo-bypass",
    "--no-check-certificates",
    "--no-warnings",
    "--no-playlist"
  );

  console.log("Running yt-dlp binary:", bin, args.join(" "));
  const res = await execFileP(bin, args, {
    maxBuffer: 25 * 1024 * 1024,
    timeout: 90000,
  });
  return res;
}

// Fast metadata fetch via YouTube oEmbed (never bot-blocked on datacenter IPs)
async function fetchVideoMetadata(url, videoId) {
  const defaultThumb = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : "";
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      url
    )}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || "",
        uploader: data.author_name || "",
        thumbnail: data.thumbnail_url || defaultThumb,
      };
    }
  } catch (err) {
    console.warn("oEmbed metadata fetch failed:", err?.message || err);
  }
  return {
    title: "",
    uploader: "",
    thumbnail: defaultThumb,
  };
}

// Cloud-resilient fallback downloader when datacenter IPs trigger YouTube bot verification
async function downloadViaFallbackApi(url, destPath) {
  const endpoints = [
    "https://p.savenow.to",
    "https://p.oceansaver.in",
  ];
  const formats = ["m4a", "mp3"];

  for (const baseUrl of endpoints) {
    for (const fmt of formats) {
      try {
        console.log(`Trying fallback downloader (${baseUrl}, format=${fmt})...`);
        const initRes = await fetch(
          `${baseUrl}/ajax/download.php?format=${fmt}&url=${encodeURIComponent(
            url
          )}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(15000),
          }
        );
        if (!initRes.ok) continue;

        const initData = await initRes.json();
        if (!initData || !initData.success || !initData.id) continue;

        const progressUrl =
          initData.progress_url ||
          `${baseUrl}/api/progress?id=${encodeURIComponent(initData.id)}`;

        let downloadUrl = initData.download_url || null;
        for (let poll = 0; poll < 25 && !downloadUrl; poll++) {
          await new Promise((r) => setTimeout(r, 1200));
          const progRes = await fetch(progressUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(10000),
          });
          if (!progRes.ok) continue;
          const progData = await progRes.json();
          if (progData && progData.download_url) {
            downloadUrl = progData.download_url;
            break;
          }
          if (
            progData &&
            typeof progData.text === "string" &&
            progData.text.toLowerCase().includes("error")
          ) {
            break;
          }
        }

        if (!downloadUrl) continue;

        const audioRes = await fetch(downloadUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(60000),
        });
        if (!audioRes.ok) continue;

        const arrayBuf = await audioRes.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length > 1000) {
          fs.writeFileSync(destPath, buf);
          console.log(
            `Fallback download complete (${baseUrl}, ${fmt}): ${buf.length} bytes`
          );
          return {
            success: true,
            title: initData.title || initData.info?.title || "",
            thumbnail:
              initData.thumbnail_url || initData.info?.image || "",
          };
        }
      } catch (err) {
        console.warn(
          `Fallback attempt (${baseUrl}, ${fmt}) failed:`,
          err?.message || err
        );
      }
    }
  }
  return { success: false };
}

// --- MongoDB connection (Single DB) ---
const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URI_NEW;

if (!mongoUri) {
  console.error("ERROR: MONGO_URI is not defined in environment variables!");
}

const mongoNew = mongoose.createConnection(mongoUri);
mongoNew.on("connected", () => console.log("MongoDB connected"));
mongoNew.on("error", (err) => console.error("MongoDB connection error:", err));

const SongNew = mongoNew.model("Song", SongSchema);
const PlaylistNew = mongoNew.model("Playlist", PlaylistSchema);

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadLargeToCloudinary(filePath, options) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(filePath, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

app.get("/", (req, res) => {
  res.send("<h1>Welcome to MUSIO backend (YouTube)</h1>");
});

app.get("/health", (req, res) => {
  res.json({ status: "awake" });
});

// UI landing page (static)
app.get("/ui", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Read-only helper for UI: list playlists
app.get("/playlists", async (req, res) => {
  try {
    const allLists = await PlaylistNew.find().populate("songs").lean();
    res.json(allLists);
  } catch (e) {
    console.error("Failed to list playlists for UI", e);
    res.status(500).json({ error: "Failed to list playlists" });
  }
});

// --- Route: Download from YouTube & upload to Cloudinary + Mongo ---
app.post("/yt-upload", async (req, res) => {
  const tempCookies = createTempCookiesCopy();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = path.join(os.tmpdir(), `yt-song-${uniqueId}.webm`);
  const mp3Path = path.join(os.tmpdir(), `yt-song-${uniqueId}.mp3`);

  try {
    const {
      url: rawUrl,
      title,
      artist,
      genre,
      playlistId,
      newPlaylistName,
    } = req.body;
    console.log(
      "Data Received",
      rawUrl,
      title,
      artist,
      genre,
      playlistId,
      newPlaylistName
    );

    if (!rawUrl || !title) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const videoId = extractYouTubeId(rawUrl);
    const url = normalizeYouTubeUrl(rawUrl);

    // 🔹 Step 1: Get video metadata quickly via oEmbed
    console.log("Fetching metadata for:", url);
    const metadata = await fetchVideoMetadata(url, videoId);
    let coverImage = metadata.thumbnail || "";

    // 🔹 Step 2: Download audio (Layer 1: yt-dlp with Node JS runtime, Layer 2: Cloud fallback API)
    const downloadOptionsList = [
      {
        output: filePath,
        format: "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
      },
      ...(tempCookies
        ? [
            {
              output: filePath,
              format: "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
              cookies: tempCookies,
            },
          ]
        : []),
      {
        output: filePath,
        format: "bestaudio/best",
        extraArgs: [
          "--extractor-args",
          "youtube:player_client=android_vr,tv_simply,mweb",
        ],
      },
    ];

    console.log("Downloading with yt-dlp (resilient mode)...");
    let downloaded = false;
    let lastError = null;

    for (const opts of downloadOptionsList) {
      try {
        console.log("Trying yt-dlp with format:", opts.format || "default");
        try {
          await runYtDlpCli(url, opts);
        } catch (innerErr) {
          const stderr =
            (innerErr && (innerErr.stderr || innerErr.stdout)) ||
            String(innerErr);
          if (
            String(stderr).toLowerCase().includes("did not get any data blocks")
          ) {
            console.log(
              "Detected HLS data block error — retrying download with HLS/ffmpeg flags"
            );
            await runYtDlpCli(url, {
              ...opts,
              extraArgs: [
                ...(opts.extraArgs || []),
                "--hls-prefer-ffmpeg",
                "--hls-use-mpegts",
              ],
            });
          } else {
            throw innerErr;
          }
        }
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
          console.log("Download complete via yt-dlp:", filePath);
          downloaded = true;
          break;
        }
      } catch (err) {
        lastError = err;
        console.error(
          "yt-dlp attempt failed:",
          err && err.stderr ? err.stderr : err
        );
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (_) {}
      }
    }

    // Layer 2: Fallback cloud downloader when yt-dlp is blocked by YouTube datacenter bot check
    if (!downloaded) {
      console.log(
        "All yt-dlp attempts failed; switching to cloud fallback downloader..."
      );
      const fallbackRes = await downloadViaFallbackApi(url, filePath);
      if (
        fallbackRes.success &&
        fs.existsSync(filePath) &&
        fs.statSync(filePath).size > 0
      ) {
        downloaded = true;
        if (!coverImage && fallbackRes.thumbnail) {
          coverImage = fallbackRes.thumbnail;
        }
      }
    }

    if (!downloaded) {
      throw lastError || new Error("YouTube audio download failed");
    }

    // 🔹 Step 3: Transcode to MP3 (if ffmpeg available) & Upload to Cloudinary
    let uploadRes;
    let uploadFilePath = filePath;

    async function transcodeToMp3(input, output) {
      const ffmpegBin = getFfmpegBinaryPath();
      await execFileP(ffmpegBin, ["-version"]);
      console.log("Transcoding to mp3:", input, "->", output);
      await execFileP(ffmpegBin, [
        "-y",
        "-i",
        input,
        "-vn",
        "-ab",
        "128k",
        "-ar",
        "44100",
        "-f",
        "mp3",
        output,
      ]);
      return output;
    }

    try {
      try {
        await transcodeToMp3(filePath, mp3Path);
        if (fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 0) {
          uploadFilePath = mp3Path;
        }
      } catch (tErr) {
        console.warn(
          "Transcode to mp3 skipped/failed; uploading original file:",
          tErr && (tErr.message || tErr)
        );
      }

      const stats = fs.statSync(uploadFilePath);
      console.log(
        `Uploading file to Cloudinary: ${uploadFilePath} (${stats.size} bytes)`
      );

      // Use resource_type: "video" (Cloudinary's standard type for audio, supporting up to 100MB and returning duration)
      try {
        uploadRes = await cloudinary.uploader.upload(uploadFilePath, {
          resource_type: "video",
          folder: "songs",
        });
      } catch (uploadErr) {
        console.warn(
          "Primary Cloudinary upload failed, retrying with upload_large / raw:",
          uploadErr && (uploadErr.message || uploadErr)
        );
        try {
          uploadRes = await uploadLargeToCloudinary(uploadFilePath, {
            resource_type: "video",
            folder: "songs",
            chunk_size: 10 * 1024 * 1024,
          });
        } catch (largeErr) {
          uploadRes = await cloudinary.uploader.upload(uploadFilePath, {
            resource_type: "raw",
            folder: "songs",
          });
        }
      }
    } finally {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}
      try {
        if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
      } catch (_) {}
    }

    // 🔹 Step 4: Save song in DB
    const song = new SongNew({
      title,
      artist: artist || metadata.uploader || "Unknown Artist",
      genre: genre || "Unknown",
      duration: metadata.duration || uploadRes.duration || 0,
      url: uploadRes.secure_url,
      coverImage,
    });
    await song.save();

    // 🔹 Step 5: Playlist logic
    let playlist;
    if (newPlaylistName && newPlaylistName.trim() !== "") {
      playlist = new PlaylistNew({
        name: newPlaylistName.trim(),
        songs: [song._id],
        coverImage: coverImage || "/playlist.png",
      });
      await playlist.save();
    } else if (playlistId) {
      playlist = await PlaylistNew.findById(playlistId);
      if (playlist) {
        playlist.songs.push(song._id);
        await playlist.save();
      }
    }

    res.json({ success: true, song, playlist });
  } catch (e) {
    console.error("YouTube download error:", e);
    res.status(500).json({
      success: false,
      error: "Download failed",
      message: e && (e.message || String(e)),
    });
  } finally {
    try {
      if (tempCookies && fs.existsSync(tempCookies)) fs.unlinkSync(tempCookies);
    } catch (_) {}
  }
});

// --- Route: Check YouTube cookie expiry ---
app.get("/cookie-expiry", async (req, res) => {
  try {
    const cookieFile = process.env.YT_COOKIES_PATH || "./cookies.txt";
    const resolved = path.resolve(__dirname, cookieFile);
    if (!fs.existsSync(resolved)) {
      return res.status(400).json({ error: "Cookie file not found" });
    }

    const content = fs.readFileSync(resolved, "utf8");
    const lines = content
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("#"));
    const expiryTimestamps = [];

    for (const line of lines) {
      const parts = line.split("\t");
      const expiry = parts[4];
      if (expiry && !isNaN(expiry) && Number(expiry) > 0) {
        expiryTimestamps.push(Number(expiry));
      }
    }

    if (expiryTimestamps.length === 0) {
      return res.json({ expiresAt: null, message: "No expiry info in cookie" });
    }

    const latestExpiry = new Date(Math.max(...expiryTimestamps) * 1000);
    res.json({
      expiresAt: latestExpiry,
      message: `Cookie expires at ${latestExpiry}`,
    });
  } catch (e) {
    console.error("Cookie expiry check error:", e);
    res.status(500).json({ error: "Failed to check cookie expiry" });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`YT Upload Server running on http://0.0.0.0:${PORT}`)
);
