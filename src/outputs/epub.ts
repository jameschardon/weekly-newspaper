import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { NEWSPAPER_DIR } from "../config.js";

export async function generateEpub(
  content: string,
  title: string,
  weekLabel: string,
): Promise<string> {
  const { default: EPub } = await import("epub-gen-memory");

  mkdirSync(NEWSPAPER_DIR, { recursive: true });

  const html = content
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hbli])/gm, "<p>")
    .replace(/(?<![>])$/gm, "</p>");

  const filename = `${weekLabel} ${title}.epub`;
  const filepath = join(NEWSPAPER_DIR, filename);

  const epubData = await EPub(
    {
      title,
      author: "Le Chroniqueur",
      publisher: "Intelligence artificielle",
      lang: "fr",
      tocTitle: "Table des matières",
      css: `
        body { font-family: Georgia, serif; line-height: 1.7; margin: 1em 2em; }
        h1 { font-size: 1.6em; border-bottom: 2px solid #333; padding-bottom: 0.3em; margin-top: 1.5em; }
        h2 { font-size: 1.3em; margin-top: 1.2em; color: #222; }
        h3 { font-size: 1.1em; margin-top: 1em; }
        p { text-align: justify; margin: 0.6em 0; }
        blockquote { border-left: 3px solid #999; padding-left: 1em; color: #444; font-style: italic; }
        li { margin: 0.3em 0; }
      `,
    },
    [{ title, content: `<body>${html}</body>` }],
  );

  writeFileSync(filepath, epubData as Buffer);
  console.log(`✓ EPUB : ${filepath}`);
  return filepath;
}
