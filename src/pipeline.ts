#!/usr/bin/env npx tsx
/**
 * Le Chroniqueur — weekly French newspaper
 * Run every Sunday morning via GitHub Actions
 */

import { subDays, format, getISOWeek, getYear } from "date-fns";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { fetchNews } from "./fetchers/news.js";
import { fetchVideos } from "./fetchers/youtube.js";
import { fetchElucidArticles } from "./fetchers/elucid.js";
import { generateNewspaper } from "./generators/newspaper.js";
import { generateEpub } from "./outputs/epub.js";

async function main() {
  const endDate = new Date();
  const since = subDays(endDate, 7);
  const weekNumber = getISOWeek(endDate);
  const year = getYear(endDate);
  const weekLabel = `${year}-S${String(weekNumber).padStart(2, "0")}`;

  console.log(`\n🗞️  LE CHRONIQUEUR — Semaine ${weekNumber}, ${year}`);
  console.log(`Période : ${format(since, "yyyy-MM-dd")} — ${format(endDate, "yyyy-MM-dd")}`);

  // ── Fetch all sources in parallel ──
  console.log("\n📡 Collecte des sources...");
  const [news, videos, elucid] = await Promise.all([
    fetchNews(since),
    fetchVideos(since),
    fetchElucidArticles(since),
  ]);

  console.log(`  ${news.length} actualités`);
  console.log(`  ${videos.length} vidéos (${videos.filter(v => v.transcript).length} avec transcription)`);
  console.log(`  ${elucid.length} articles Elucid`);

  const totalContent = news.length + videos.length + elucid.length;
  if (totalContent < 5) {
    console.error("Pas assez de contenu pour générer le journal (< 5 items)");
    process.exit(1);
  }

  // ── Generate newspaper ──
  console.log("\n✍️  Génération du journal...");
  const result = await generateNewspaper(news, videos, elucid, endDate);

  // ── Save markdown backup ──
  const outputDir = join(process.cwd(), "output");
  mkdirSync(outputDir, { recursive: true });
  const mdPath = join(outputDir, `${weekLabel}-le-chroniqueur.md`);
  writeFileSync(mdPath, result.content, "utf-8");
  console.log(`✓ Markdown : ${mdPath}`);

  // ── Generate EPUB ──
  console.log("\n📖 Génération de l'EPUB...");
  const title = `Le Chroniqueur — Semaine ${weekNumber}, ${year}`;
  await generateEpub(result.content, title, weekLabel);

  console.log(`\n✅ Terminé — ${result.wordCount.toLocaleString()} mots`);
}

main().catch(e => {
  console.error("Pipeline échoué:", e);
  process.exit(1);
});
