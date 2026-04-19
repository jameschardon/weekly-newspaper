import { spawn } from "child_process";

export async function claudeCallAsync(
  prompt: string,
  model = "claude-opus-4-7",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["--print", "--model", model], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("claude call timed out after 15 minutes"));
    }, 15 * 60 * 1000);
    child.stdout.on("data", (d: Buffer) => chunks.push(d));
    child.stderr.on("data", (d: Buffer) => errChunks.push(d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(Buffer.concat(chunks).toString("utf8").trim());
      } else {
        const stderr = Buffer.concat(errChunks).toString("utf8");
        reject(new Error(`claude exited with code ${code}: ${stderr}`));
      }
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
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
