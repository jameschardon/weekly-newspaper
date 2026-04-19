import { execFileSync } from "child_process";

export function claudeCallAsync(
  prompt: string,
  model = "claude-opus-4-7",
): Promise<string> {
  return Promise.resolve(
    execFileSync("claude", ["--print", "--model", model], {
      input: prompt,
      encoding: "utf-8",
      timeout: 15 * 60 * 1000,
      maxBuffer: 20 * 1024 * 1024,
    }).trim()
  );
}

export function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "\n[... tronque]";
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}
