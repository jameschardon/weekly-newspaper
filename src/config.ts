import { join } from "path";
import { homedir } from "os";
import { config as loadEnv } from "dotenv";

loadEnv({ path: join(homedir(), ".config/weekly-newspaper/.env"), override: true });

export const CHANNELS = [
  { name: "ELUCID",                         channelId: "UCkgO4A3Fzm5D9Xu1Y_4vCKQ" },
  { name: "Idriss J. Aberkane",             channelId: "UCsBPtU4hJkWNQ4kA-IsxgKw" },
  { name: "Thinkerview",                    channelId: "UCQgWpmt02UtJkyO32HGUASQ" },
  { name: "Marc Touati",                    channelId: "UCX0IqCxHb4xhdE9QPixAlfg" },
  { name: "Institut des Libertés",          channelId: "UCaqUCTIgFDtMhBeKeeejrkA" },
  { name: "Antithèse",                      channelId: "UCpGdJo_WsBhAUf1WA2SYcIQ" },
  { name: "Scanderia",                      channelId: "UCtJuE2ar0ptD5b12ueCMq1w" },
];

export const NEWS_FEEDS = [
  "https://news.google.com/rss?hl=fr&gl=FR&ceid=FR:fr",
  "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtWnlHZ0pHVWlnQVAB?hl=fr&gl=FR&ceid=FR:fr",
  "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtWnlHZ0pHVWlnQVAB?hl=fr&gl=FR&ceid=FR:fr",
  "https://news.google.com/rss/search?q=geopolitique+economie&hl=fr&gl=FR&ceid=FR:fr",
  "https://news.google.com/rss/search?q=France+politique&hl=fr&gl=FR&ceid=FR:fr",
  "https://www.lemonde.fr/economie/rss_full.xml",
  "https://www.lemonde.fr/international/rss_full.xml",
  "https://www.lefigaro.fr/rss/figaro_economie.xml",
  "https://www.france24.com/fr/rss",
  "https://www.contrepoints.org/feed",
];

export const ELUCID = {
  feedUrl: "https://elucid.media/feed",
  siteUrl: "https://elucid.media",
  email: process.env.ELUCID_EMAIL || "",
  password: process.env.ELUCID_PASSWORD || "",
};

export const API = {
  draftModel: "claude-opus-4-7",
  editorialModel: "claude-opus-4-7",
  maxTokens: 16384,
};

export const NEWSPAPER_DIR = join(homedir(), "Newspaper");
