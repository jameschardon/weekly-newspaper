import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function claudeCallAsync(
  prompt: string,
  model = "claude-opus-4-7",
): Promise<string> {
  const args = ["--print", "--model", model];
  const { stdout } = await execFileAsync("claude", args, {
    input: prompt,
    timeout: 15 * 60 * 1000,
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout.trim();
}

export function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "\n[... tronqué]";
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
