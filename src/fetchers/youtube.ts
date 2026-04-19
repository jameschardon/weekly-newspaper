import Parser from "rss-parser";
import { readFileSync } from "fs";
import { join } from "path";
import { createRequire } from "node:module";
import { CHANNELS } from "../config.js";

const rssParser = new Parser({
  customFields: {
    item: [["yt:videoId", "ytVideoId"]],
  },
});

// ESM/CJS interop for youtube-transcript
const esmRequire = createRequire(import.meta.url);
let ytFetchTranscript: ((videoId: string) => Promise<Array<{ text: string }>>) | null = null;

try {
  const ytModPath = join(process.cwd(), "node_modules", "youtube-transcript", "dist", "youtube-transcript.common.js");
  const ytCode = readFileSync(ytModPath, "utf8");
  const ytMod: any = {};
  new Function("exports", "require", "module", ytCode)(ytMod, esmRequire, { exports: ytMod });
  ytFetchTranscript = ytMod.fetchTranscript;
} catch {
  console.warn("[youtube] transcript module not available");
}

export interface Video {
  videoId: string;
  title: string;
  channelName: string;
  publishedAt: string;
  transcript: string | null;
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  if (!ytFetchTranscript) return null;
  try {
    const entries = await ytFetchTranscript(videoId);
    if (!entries || entries.length === 0) return null;
    return entries.map((e) => e.text).join(" ").trim() || null;
  } catch {
    return null;
  }
}

export async function fetchVideos(since: Date): Promise<Video[]> {
  const videos: Video[] = [];

  await Promise.allSettled(
    CHANNELS.map(async (channel) => {
      try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
        const feed = await rssParser.parseURL(feedUrl);

        for (const item of (feed.items || []).slice(0, 10)) {
          const videoId = (item as any).ytVideoId || item.link?.match(/v=([^&]+)/)?.[1];
          if (!videoId) continue;
          const title = item.title || "";
          if (title.toLowerCase().includes("#shorts")) continue;

          const pubDate = item.pubDate ? new Date(item.pubDate) : null;
          if (pubDate && pubDate < since) continue;

          videos.push({
            videoId,
            title,
            channelName: channel.name,
            publishedAt: item.pubDate || "",
            transcript: null,
          });
        }
      } catch {
        // skip failed channels
      }
    })
  );

  // Fetch transcripts in parallel (cap at 10 concurrent)
  const withTranscripts = await Promise.all(
    videos.map(async (v) => ({
      ...v,
      transcript: await fetchTranscript(v.videoId),
    }))
  );

  return withTranscripts;
}
