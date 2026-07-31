import { NextRequest, NextResponse } from "next/server";

function isAllowedUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  if (!isAllowedUrl(url)) return NextResponse.json({ error: "invalid url" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 502 });

    const contentType = res.headers.get("content-type") ?? "";
    const isHtml = contentType.includes("text/html");

    const imageUrl = isHtml ? await resolveOgImageUrl(url, res) : url;
    if (!imageUrl || !isAllowedUrl(imageUrl)) {
      return NextResponse.json({ error: "image not found" }, { status: 404 });
    }

    const imageRes = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400 },
    });
    if (!imageRes.ok) return NextResponse.json({ error: "image fetch failed" }, { status: 502 });

    const buffer = await imageRes.arrayBuffer();
    const imageContentType = imageRes.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": imageContentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "proxy error" }, { status: 500 });
  }
}

async function resolveOgImageUrl(sourceUrl: string, response: Response) {
  const html = await response.text();
  const match = html.match(
    /property="og:image"[^>]*content="([^"]+)"|content="([^"]+)"[^>]*property="og:image"/i,
  );
  const candidate = match?.[1] ?? match?.[2];
  if (!candidate) return null;

  try {
    return new URL(candidate, sourceUrl).toString();
  } catch {
    return null;
  }
}
