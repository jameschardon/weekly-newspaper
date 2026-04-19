import Parser from "rss-parser";
import { parse as parseHTML } from "node-html-parser";
import { ELUCID } from "../config.js";
import { stripHtml } from "../utils.js";

const rssParser = new Parser();

export interface ElucidArticle {
  title: string;
  author: string;
  url: string;
  publishedAt: string;
  content: string;
}

async function login(): Promise<string | null> {
  if (!ELUCID.email || !ELUCID.password) return null;
  try {
    const r1 = await fetch("https://compte.elucid.media/elucid/connexion", {
      headers: { "User-Agent": "Mozilla/5.0" }, redirect: "manual",
    });
    const c1 = (r1.headers.getSetCookie?.() || []).map(c => c.split(";")[0]).join("; ");

    const r2 = await fetch("https://compte.elucid.media/elucid/connexion", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0", Cookie: c1 },
      body: new URLSearchParams({ email: ELUCID.email }), redirect: "manual",
    });
    const c2 = [...(r1.headers.getSetCookie?.() || []), ...(r2.headers.getSetCookie?.() || [])].map(c => c.split(";")[0]).join("; ");

    const r3 = await fetch("https://compte.elucid.media/elucid/connexion", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0", Cookie: c2 },
      body: new URLSearchParams({ email: ELUCID.email, password: ELUCID.password }), redirect: "manual",
    });
    const allCookies = [...(r1.headers.getSetCookie?.() || []), ...(r2.headers.getSetCookie?.() || []), ...(r3.headers.getSetCookie?.() || [])].map(c => c.split(";")[0]).join("; ");

    const location = r3.headers.get("location");
    if (location) {
      const r4 = await fetch(location, { headers: { "User-Agent": "Mozilla/5.0", Cookie: allCookies }, redirect: "manual" });
      const c4 = r4.headers.getSetCookie?.() || [];
      return [...allCookies.split("; "), ...c4.map(c => c.split(";")[0])].join("; ");
    }
    return allCookies;
  } catch {
    return null;
  }
}

async function fetchContent(url: string, cookies: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Cookie: cookies } });
    const html = await res.text();
    const doc = parseHTML(html);
    const el = doc.querySelector("article .entry-content") || doc.querySelector(".article-content") || doc.querySelector("article");
    if (!el) return null;
    el.querySelectorAll("script,style,.paywall,.subscription-cta,nav,.comments,iframe").forEach(n => n.remove());
    const text = stripHtml(el.innerHTML);
    // Skip video-only articles (no summary section)
    if (!el.innerHTML.includes('class="summary"')) return null;
    return text;
  } catch {
    return null;
  }
}

export async function fetchElucidArticles(since: Date): Promise<ElucidArticle[]> {
  const articles: ElucidArticle[] = [];
  try {
    const feed = await rssParser.parseURL(ELUCID.feedUrl);
    const recent = (feed.items || []).filter(item => {
      if (!item.link) return false;
      const pub = item.pubDate ? new Date(item.pubDate) : null;
      return !pub || pub >= since;
    }).slice(0, 7);

    if (recent.length === 0) return articles;

    const cookies = await login();
    if (!cookies) {
      console.warn("[elucid] login failed — skipping content fetch");
      return articles;
    }

    await Promise.allSettled(
      recent.map(async (item) => {
        const content = await fetchContent(item.link!, cookies);
        if (!content) return;
        articles.push({
          title: item.title || "Sans titre",
          author: (item as any)["dc:creator"] || "",
          url: item.link!,
          publishedAt: item.pubDate || "",
          content,
        });
      })
    );
  } catch (e: any) {
    console.error("[elucid] fetch error:", e.message);
  }
  return articles;
}
