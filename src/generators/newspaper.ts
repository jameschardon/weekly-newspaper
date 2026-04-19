import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { API } from "../config.js";
import { claudeCallAsync, truncateToWords } from "../utils.js";
import type { NewsItem } from "../fetchers/news.js";
import type { Video } from "../fetchers/youtube.js";
import type { ElucidArticle } from "../fetchers/elucid.js";

const MAX_WORDS = 5000;
const MAX_TRANSCRIPT_WORDS = 5000;

// ── Section prompts ────────────────────────────────────────────

const POLITIQUE_PROMPT = `Tu es analyste politique et géopolitique pour un hebdomadaire indépendant francophone.
À partir du matériel source ci-dessous, rédige la section "Politique & Géopolitique" d'un journal hebdomadaire approfondi.

CONSIGNES :
- Analyse en profondeur, pas un simple résumé. Identifie les tendances de fond, les rapports de force, les enjeux stratégiques.
- Établis des connexions entre les événements de la semaine.
- Mets en évidence les contradictions entre les discours officiels et les faits.
- Contextualise historiquement quand c'est pertinent.
- Structure avec des sous-titres thématiques (### Sous-titre).
- Longueur : 1000-2000 mots.
- Écris en français clair et analytique.
- N'inclus pas de titre de section principal.`;

const ECONOMIE_PROMPT = `Tu es analyste économique et financier pour un hebdomadaire indépendant francophone.
À partir du matériel source ci-dessous, rédige la section "Économie & Finance" d'un journal hebdomadaire approfondi.

CONSIGNES :
- Analyse les tendances économiques de la semaine : marchés, politique monétaire, emploi, commerce international.
- Chiffres et données précis obligatoires — ne reste pas dans les généralités.
- Identifie les signaux faibles et les risques émergents.
- Explique les mécanismes sous-jacents (pas juste "le marché a baissé").
- Mets en perspective par rapport aux tendances longues.
- Structure avec des sous-titres thématiques (### Sous-titre).
- Longueur : 1000-2000 mots.
- Écris en français clair et analytique.
- N'inclus pas de titre de section principal.`;

const ANALYSES_PROMPT = `Tu es chroniqueur intellectuel pour un hebdomadaire indépendant francophone.
À partir des transcriptions YouTube et articles ci-dessous, rédige la section "Analyses & Décryptages" d'un journal hebdomadaire.

CONSIGNES :
- Pour chaque source significative, produis une analyse approfondie (500-800 mots) qui capture :
  * La thèse centrale et l'argumentation
  * Les données, chiffres ou preuves cités
  * Les citations marquantes (entre guillemets)
  * Le positionnement par rapport au débat public
  * Les limites ou angles morts de l'analyse
- Établis des ponts entre les différentes analyses quand les sujets se recoupent.
- Crédite systématiquement la chaîne/source.
- Structure : un ### par source analysée.
- Longueur totale : 1500-3000 mots.
- Écris en français clair et analytique.
- N'inclus pas de titre de section principal.`;

const EN_BREF_PROMPT = `Tu es rédacteur pour un hebdomadaire indépendant francophone.
À partir du matériel source ci-dessous, rédige la section "En bref" — synthèse rapide des informations secondaires de la semaine.

CONSIGNES :
- Liste à puces concise et informative.
- Chaque item : 1-2 phrases maximum.
- Couvre les sujets qui ne méritent pas un développement complet mais restent pertinents.
- 10-20 items maximum.
- Écris en français clair.
- N'inclus pas de titre de section principal.`;

const EDITORIAL_PROMPT = `Tu es le rédacteur en chef de "Le Chroniqueur", hebdomadaire indépendant d'analyse politique, économique et géopolitique.

Tu reçois les quatre sections brutes du journal de cette semaine. Ton travail :

1. **Éditorial** (500-700 mots) :
   - Identifie LE fil rouge de la semaine
   - Prend position avec nuance et profondeur
   - Ouvre sur une réflexion plus large (historique, philosophique, stratégique)
   - Ton : grave mais pas pompeux, engagé, intellectuellement honnête

2. **Table des matières** : titres de chaque section et sous-section.

3. **Harmonisation** :
   - Voix éditoriale cohérente d'un bout à l'autre
   - Références croisées entre sections quand les sujets se recoupent
   - Correction des répétitions
   - Transitions fluides

4. **Structure finale exacte** :

# Le Chroniqueur — Semaine {SEMAINE}, {ANNEE}
*Du {DATE_DEBUT} au {DATE_FIN}*

## Table des matières
[liens]

## Éditorial
[éditorial]

---

## Politique & Géopolitique
[section harmonisée]

## Économie & Finance
[section harmonisée]

## Analyses & Décryptages
[section harmonisée]

## En bref
[section harmonisée]

---

## Sources
[liste numérotée des sources principales]

---
*Le Chroniqueur est généré par intelligence artificielle à partir de sources ouvertes.*

CONSIGNES : longueur totale 4000-7000 mots. Tout en français. Markdown propre. Remplace les placeholders par les vraies valeurs. Ton : croisement entre Le Monde Diplomatique et The Economist.`;

// ── Input assembly ─────────────────────────────────────────────

const POL_KW = /politi|géopoliti|diplomati|guerre|conflit|otan|nato|onu|election|parlement|gouvern|presiden|reforme|securit|migrat/i;
const ECO_KW = /econom|financ|bourse|marché|inflation|taux|banque|dette|fiscal|budget|pib|chomage|emploi|commerce|crypto|pétrole|energie/i;

function buildPolitiqueInput(news: NewsItem[], elucid: ElucidArticle[]): string {
  const parts = ["# Sources — Politique & Géopolitique\n"];
  const polNews = news.filter(n => POL_KW.test(n.title) || POL_KW.test(n.snippet));
  if (polNews.length > 0) {
    parts.push("## Actualités\n");
    for (const n of polNews.slice(0, 40)) {
      parts.push(`- **${n.title}** (${n.source})\n  ${n.snippet.slice(0, 300)}`);
    }
    parts.push("");
  }
  const polPress = elucid.filter(a => POL_KW.test(a.title) || POL_KW.test(a.content.slice(0, 500)));
  for (const a of polPress.slice(0, 4)) {
    parts.push(`### ELUCID : "${a.title}"${a.author ? ` — ${a.author}` : ""}`);
    parts.push(truncateToWords(a.content, 2000));
    parts.push("");
  }
  return truncateToWords(parts.join("\n"), MAX_WORDS);
}

function buildEconomieInput(news: NewsItem[], elucid: ElucidArticle[]): string {
  const parts = ["# Sources — Économie & Finance\n"];
  const ecoNews = news.filter(n => ECO_KW.test(n.title) || ECO_KW.test(n.snippet));
  if (ecoNews.length > 0) {
    parts.push("## Actualités\n");
    for (const n of ecoNews.slice(0, 40)) {
      parts.push(`- **${n.title}** (${n.source})\n  ${n.snippet.slice(0, 300)}`);
    }
    parts.push("");
  }
  const ecoPress = elucid.filter(a => ECO_KW.test(a.title) || ECO_KW.test(a.content.slice(0, 500)));
  for (const a of ecoPress.slice(0, 4)) {
    parts.push(`### ELUCID : "${a.title}"${a.author ? ` — ${a.author}` : ""}`);
    parts.push(truncateToWords(a.content, 2000));
    parts.push("");
  }
  return truncateToWords(parts.join("\n"), MAX_WORDS);
}

function buildAnalysesInput(videos: Video[], elucid: ElucidArticle[]): string {
  const parts = ["# Sources — Analyses\n"];
  for (const v of videos.filter(v => v.transcript).slice(0, 8)) {
    parts.push(`## ${v.channelName} : "${v.title}" (${v.publishedAt})`);
    parts.push(truncateToWords(v.transcript!, MAX_TRANSCRIPT_WORDS));
    parts.push("");
  }
  const deepPress = elucid.filter(a => !POL_KW.test(a.title) && !ECO_KW.test(a.title));
  for (const a of deepPress.slice(0, 3)) {
    parts.push(`## ELUCID : "${a.title}"${a.author ? ` — ${a.author}` : ""}`);
    parts.push(truncateToWords(a.content, 2000));
    parts.push("");
  }
  return parts.join("\n");
}

function buildEnBrefInput(news: NewsItem[], videos: Video[]): string {
  const parts = ["# Sources — En bref\n"];
  const other = news.filter(n => !POL_KW.test(n.title) && !ECO_KW.test(n.title));
  if (other.length > 0) {
    parts.push("## Actualités diverses\n");
    for (const n of other.slice(0, 30)) parts.push(`- **${n.title}** (${n.source})`);
    parts.push("");
  }
  const noTranscript = videos.filter(v => !v.transcript);
  if (noTranscript.length > 0) {
    parts.push("## Vidéos sans transcription\n");
    for (const v of noTranscript) parts.push(`- ${v.channelName} : "${v.title}"`);
    parts.push("");
  }
  return truncateToWords(parts.join("\n"), MAX_WORDS);
}

// ── Section generation ─────────────────────────────────────────

async function generateSection(prompt: string, input: string, name: string): Promise<string> {
  const wordCount = input.split(/\s+/).length;
  console.log(`  [${name}] ${wordCount} mots d'entrée...`);
  if (wordCount < 20) return `*Pas suffisamment de contenu cette semaine pour cette section.*`;
  const result = await claudeCallAsync(`${prompt}\n\n---\n\nMATÉRIEL SOURCE :\n\n${input}`, API.draftModel, API.maxTokens);
  console.log(`  [${name}] ${result.split(/\s+/).length} mots générés`);
  return result;
}

// ── Main generator ─────────────────────────────────────────────

export interface NewspaperResult {
  content: string;
  wordCount: number;
  weekNumber: number;
  year: number;
}

export async function generateNewspaper(
  news: NewsItem[],
  videos: Video[],
  elucid: ElucidArticle[],
  endDate: Date,
): Promise<NewspaperResult> {
  const { getISOWeek, getYear, subDays, format: fmtDate } = await import("date-fns");
  const { fr: frLocale } = await import("date-fns/locale");

  const weekNumber = getISOWeek(endDate);
  const year = getYear(endDate);
  const startDate = subDays(endDate, 6);
  const startFr = fmtDate(startDate, "d MMMM yyyy", { locale: frLocale });
  const endFr = fmtDate(endDate, "d MMMM yyyy", { locale: frLocale });

  console.log(`\n═══ Pass 1 : 4 agents Opus 4.7 en parallèle ═══`);

  const [politique, economie, analyses, enBref] = await Promise.all([
    generateSection(POLITIQUE_PROMPT, buildPolitiqueInput(news, elucid), "Politique"),
    generateSection(ECONOMIE_PROMPT, buildEconomieInput(news, elucid), "Économie"),
    generateSection(ANALYSES_PROMPT, buildAnalysesInput(videos, elucid), "Analyses"),
    generateSection(EN_BREF_PROMPT, buildEnBrefInput(news, videos), "En bref"),
  ]);

  console.log(`\n═══ Pass 2 : Éditorial Opus 4.7 ═══`);

  const sectionsRaw = `
## Politique & Géopolitique

${politique}

## Économie & Finance

${economie}

## Analyses & Décryptages

${analyses}

## En bref

${enBref}
`.trim();

  const editorialInput = `${EDITORIAL_PROMPT}

---

CONTEXTE :
- Semaine : ${weekNumber}, ${year}
- Période : du ${startFr} au ${endFr}
- Sources : ${news.length} actualités, ${videos.filter(v => v.transcript).length} transcriptions YouTube, ${elucid.length} articles Elucid

---

SECTIONS BRUTES :

${sectionsRaw}`;

  const content = await claudeCallAsync(editorialInput, API.editorialModel, API.maxTokens);
  const wordCount = content.split(/\s+/).length;

  console.log(`\n✓ Journal généré : ${wordCount.toLocaleString()} mots`);

  return { content, wordCount, weekNumber, year };
}
