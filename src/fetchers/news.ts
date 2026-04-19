import Parser from "rss-parser";
import { NEWS_FEEDS } from "../config.js";

const rssParser = new Parser();

export interface NewsItem {
  title: string;
  source: string;
  snippet: string;
  publishedAt: string;
  url: string;
}

export async function fetchNews(since: Date): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  const seen = new Set<string>();

  await Promise.allSettled(
    NEWS_FEEDS.map(async (feedUrl) => {
      try {
        const feed = await rssParser.parseURL(feedUrl);
        const source = feed.title?.replace(/Google News.*/, "Google News").trim() || new URL(feedUrl).hostname;
        for (const item of feed.items || []) {
          if (!item.link || !item.title) continue;
          const pubDate = item.pubDate ? new Date(item.pubDate) : null;
          if (pubDate && pubDate < since) continue;
          if (seen.has(item.link)) continue;
          seen.add(item.link);
          items.push({
            title: item.title,
            source,
            snippet: item.contentSnippet || item.content || "",
            publishedAt: item.pubDate || "",
            url: item.link,
          });
        }
      } catch {
        // skip failed feeds
      }
    })
  );

  return items;
}
