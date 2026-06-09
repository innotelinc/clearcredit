import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const badgesDir = path.join(root, "public", "badges");
await fs.mkdir(badgesDir, { recursive: true });

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function makeBadge(label, value, { left = "#0f172a", right = "#2563eb", width = 360 } = {}) {
  const leftWidth = Math.max(104, Math.round(label.length * 10 + 28));
  const rightWidth = Math.max(130, Math.round(value.length * 10 + 28));
  const totalWidth = Math.max(width, leftWidth + rightWidth);
  const rightX = leftWidth;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="42" role="img" aria-label="${esc(label)}: ${esc(value)}">
  <rect width="${leftWidth}" height="42" rx="10" fill="${left}"/>
  <rect x="${rightX}" width="${totalWidth - leftWidth}" height="42" rx="10" fill="${right}"/>
  <rect x="${rightX - 10}" width="20" height="42" fill="${right}"/>
  <text x="18" y="27" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700">${esc(label)}</text>
  <text x="${rightX + 16}" y="27" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700">${esc(value)}</text>
</svg>`;
}

const badges = {
  "release.svg": makeBadge("release", "v0.2.0", { right: "#1d4ed8" }),
  "portable.svg": makeBadge("portable", "zip + tar.gz", { right: "#0f766e" }),
  "stack.svg": makeBadge("stack", "Next.js + Prisma + Stripe", { right: "#7c3aed", width: 470 }),
  "llm.svg": makeBadge("llm", "proxy / OpenRouter / OpenAI", { right: "#0369a1", width: 500 }),
};

for (const [name, content] of Object.entries(badges)) {
  await fs.writeFile(path.join(badgesDir, name), content, "utf8");
}

const svgPath = path.join(root, "public", "repo-social-preview.svg");
const pngPath = path.join(root, "public", "repo-social-preview.png");
const svg = await fs.readFile(svgPath);
await sharp(svg).png().toFile(pngPath);

console.log(`wrote ${Object.keys(badges).length} badges and ${path.relative(root, pngPath)}`);
