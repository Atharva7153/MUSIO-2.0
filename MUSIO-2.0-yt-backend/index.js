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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
// Serve minimal UI from public/
app.use(express.static(path.join(__dirname, "public")));

// Helper: locate yt-dlp binary (checks ./bin, bundled node_modules, /usr/local/bin, then PATH)
function getYtDlpBinaryPath() {
  const binName = os.platform().startsWith("win") ? "yt-dlp.exe" : "yt-dlp";
  const candidates = [
    path.join(__dirname, "bin", binName),
    path.join(__dirname, "node_modules", "yt-dlp-exec", "bin", binName),
    "/usr/local/bin/yt-dlp",
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return binName;
}

// Helper: copy cookies.txt to a temp file so yt-dlp doesn't overwrite/corrupt the original file
function createTempCookiesCopy() {
  const cookiePath = process.env.YT_COOKIES_PATH || "./cookies.txt";
  const resolved = path.resolve(__dirname, cookiePath);
  if (!fs.existsSync(resolved)) return null;
  const tempPath = path.join(
    os.tmpdir(),
    `yt-cookies-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
  );
  fs.copyFileSync(resolved, tempPath);
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
  args.push("--no-check-certificates", "--no-warnings", "--no-playlist");

  console.log("Running yt-dlp binary:", bin, args.join(" "));
  const res = await execFileP(bin, args, { maxBuffer: 20 * 1024 * 1024 });
  return res;
}

async function fetchVideoMetadata(url, tempCookies) {
  const attempts = [
    { extraArgs: ["--dump-single-json"] },
    {
      extraArgs: [
        "--dump-single-json",
        "--extractor-args",
        "youtube:player_client=ios,mweb",
      ],
    },
    ...(tempCookies
      ? [{ cookies: tempCookies, extraArgs: ["--dump-single-json"] }]
      : []),
  ];

  for (const opts of attempts) {
    try {
      const { stdout } = await runYtDlpCli(url, opts);
      if (stdout) {
        return JSON.parse(stdout.trim());
      }
    } catch (err) {
      console.warn(
        "Metadata attempt failed:",
        err && (err.stderr || err.message)
      );
    }
  }
  return {};
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
  const filePath = path.join(__dirname, `yt-song-${Date.now()}.webm`);
  const mp3Path = filePath.replace(/\.[^.]+$/, ".mp3");

  try {
    const { url, title, artist, genre, playlistId, newPlaylistName } = req.body;
    console.log(
      "Data Received",
      url,
      title,
      artist,
      genre,
      playlistId,
      newPlaylistName
    );

    if (!url || !title) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔹 Step 1: Get video metadata
    console.log("Fetching metadata...");
    const metadata = await fetchVideoMetadata(url, tempCookies);
    const coverImage = metadata.thumbnail || "";

    // 🔹 Step 2: Download audio
    const downloadOptionsList = [
      { output: filePath, format: "bestaudio" },
      {
        output: filePath,
        format: "bestaudio/best",
        extraArgs: ["--extractor-args", "youtube:player_client=ios,mweb"],
      },
      ...(tempCookies
        ? [
            { output: filePath, format: "bestaudio", cookies: tempCookies },
            {
              output: filePath,
              format: "bestaudio[ext=webm]/bestaudio/best",
              cookies: tempCookies,
            },
            {
              output: filePath,
              format: "bestaudio/best",
              cookies: tempCookies,
            },
          ]
        : []),
      { output: filePath, format: "bestaudio/best" },
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
          console.log("Download complete:", filePath);
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

    if (!downloaded) {
      throw lastError || new Error("yt-dlp failed for unknown reason");
    }

    // 🔹 Step 3: Transcode to MP3 (if ffmpeg available) & Upload to Cloudinary
    let uploadRes;
    let uploadFilePath = filePath;

    async function transcodeToMp3(input, output) {
      await execFileP("ffmpeg", ["-version"]);
      console.log("Transcoding to mp3:", input, "->", output);
      await execFileP("ffmpeg", [
        "-y",
        "-i",
        input,
        "-vn",
        "-ab",
        "192k",
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
        uploadFilePath = mp3Path;
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

      try {
        const ext = path.extname(uploadFilePath || "").toLowerCase();
        const audioExts = new Set([
          ".mp3",
          ".webm",
          ".wav",
          ".m4a",
          ".aac",
          ".flac",
          ".ogg",
        ]);
        const resourceType = audioExts.has(ext) ? "raw" : "video";
        uploadRes = await cloudinary.uploader.upload(uploadFilePath, {
          resource_type: resourceType,
          folder: "songs",
        });
      } catch (uploadErr) {
        const code =
          uploadErr &&
          (uploadErr.http_code || uploadErr.statusCode || uploadErr.status);
        const is413 =
          code === 413 ||
          (uploadErr &&
            typeof uploadErr === "object" &&
            JSON.stringify(uploadErr).includes("413"));
        console.error(
          "Cloudinary upload failed:",
          uploadErr && (uploadErr.message || uploadErr)
        );

        if (is413) {
          uploadRes = await cloudinary.uploader.upload_large(uploadFilePath, {
            resource_type: "video",
            folder: "songs",
            chunk_size: 10 * 1024 * 1024,
          });
        } else {
          throw uploadErr;
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
      duration: metadata.duration,
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
