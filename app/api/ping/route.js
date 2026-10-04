import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let ytBackendStatus = "unknown";
  try {
    const res = await fetch("http://127.0.0.1:4000/health", {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      ytBackendStatus = "awake";
    } else {
      ytBackendStatus = "unreachable";
    }
  } catch (_) {
    ytBackendStatus = "offline";
  }

  return NextResponse.json(
    {
      ok: true,
      status: "alive",
      message: "pong",
      ytBackend: ytBackendStatus,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
