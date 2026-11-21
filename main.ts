// news-image-20261121 — draws one 1024x1024 PNG summing up the world news of
// Saturday 21 November 2026. Data-driven: the stories are plain data, the
// renderer below turns them into pixels. Node 22 stdlib only, deterministic.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------- CRC32 ----
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ------------------------------------------------------------- bitmap font --
// 5x7 glyphs, uppercase + digits + punctuation. '#' = ink, '.' = blank.
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".....", ".##..", ".#..."],
  "'": ["..#..", "..#..", "..#..", ".....", ".....", ".....", "....."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "(": ["...#.", "..#..", "..#..", "..#..", "..#..", "..#..", "...#."],
  ")": [".#...", "..#..", "..#..", "..#..", "..#..", "..#..", ".#..."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", "#.##.", "#..##"],
  "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
  "&": [".##..", "#..#.", "#..#.", ".#...", "#.#.#", "#..#.", ".##.#"],
  "$": ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

// ------------------------------------------------------------- canvas ------
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

function setPixel(x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
}

function fillRect(
  x: number, y: number, w: number, h: number,
  r: number, g: number, b: number,
): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) setPixel(i, j, r, g, b);
  }
}

function drawText(
  x: number, y: number, text: string, scale: number,
  r: number, g: number, b: number,
): number {
  let cx = x;
  const upper = text.toUpperCase();
  for (const ch of upper) {
    const glyph = FONT[ch] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "#") {
          fillRect(cx + col * scale, y + row * scale, scale, scale, r, g, b);
        }
      }
    }
    cx += 6 * scale;
  }
  return cx - x;
}

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawTextCentered(
  y: number, text: string, scale: number,
  r: number, g: number, b: number,
): void {
  const w = textWidth(text, scale);
  drawText(Math.floor((W - w) / 2), y, text, scale, r, g, b);
}

// Greedy word wrap to a pixel width.
function wrapText(text: string, maxW: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line ? line + " " + word : word;
    if (textWidth(trial, scale) <= maxW || !line) {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ------------------------------------------------------------------ data ---
type Story = {
  tag: string;
  tagColor: [number, number, number];
  headline: string;
  body: string;
};

const STORIES: Story[] = [
  {
    tag: "CONFLICT",
    tagColor: [185, 28, 28],
    headline: "RUSSIA STRIKES UKRAINE, MISSILES LAND IN POLAND",
    body: "400+ drones and 110 missiles hit Kyiv overnight, killing 8. Poland says two missiles fell on its soil; PM Tusk calls it a deliberate provocation.",
  },
  {
    tag: "ECONOMY",
    tagColor: [30, 64, 175],
    headline: "AI SELL-OFF PUSHES S&P 500 INTO CORRECTION",
    body: "US stocks fell 3.7% as AI and chip shares slid. The Nasdaq dropped 5.3% and the S&P 500 entered correction territory.",
  },
  {
    tag: "JUSTICE",
    tagColor: [15, 118, 110],
    headline: "ICJ: MYANMAR COMMITTED ROHINGYA GENOCIDE",
    body: "The International Court of Justice found Myanmar responsible for genocide against the Rohingya. Myanmar calls the ruling biased.",
  },
  {
    tag: "HEALTH",
    tagColor: [22, 101, 52],
    headline: "PANCREATIC CANCER PILL BREAKTHROUGH",
    body: "Trial drug daraxonrasib made tumours undetectable on scans in 1 in 12 patients, a major step against a deadly cancer.",
  },
  {
    tag: "POLITICS",
    tagColor: [76, 29, 149],
    headline: "UK AND EU SIGN BIGGEST POST-BREXIT DEALS",
    body: "Three agreements on food exports, carbon markets and youth mobility signed in Brussels, the biggest step since Brexit.",
  },
  {
    tag: "CLIMATE",
    tagColor: [180, 83, 9],
    headline: "COP31 DEADLOCKED OVER FOSSIL FUELS",
    body: "Climate talks in Antalya run past deadline as nearly 200 nations fail to agree on phasing out fossil fuels.",
  },
  {
    tag: "TECH",
    tagColor: [30, 58, 95],
    headline: "ANTHROPIC DEBUTS ON WALL STREET AT $2 TRILLION",
    body: "The AI company joins the world's most valuable public firms, opening trading with a market value near $2 trillion.",
  },
];

// --------------------------------------------------------------- palette ---
const PAPER: [number, number, number] = [248, 244, 232];
const INK: [number, number, number] = [26, 26, 26];
const RED: [number, number, number] = [185, 28, 28];
const MUTED: [number, number, number] = [90, 84, 72];

// ------------------------------------------------------------------ draw ---
fillRect(0, 0, W, H, PAPER[0], PAPER[1], PAPER[2]);

// Masthead.
drawTextCentered(28, "THE WORLD IN ONE DAY", 4, INK[0], INK[1], INK[2]);
drawTextCentered(96, "SATURDAY, 21 NOVEMBER 2026", 2, RED[0], RED[1], RED[2]);
fillRect(40, 138, W - 80, 3, INK[0], INK[1], INK[2]);
fillRect(40, 146, W - 80, 1, INK[0], INK[1], INK[2]);

// Lead story (first in the data), full width.
const lead = STORIES[0];
fillRect(40, 168, W - 80, 30, lead.tagColor[0], lead.tagColor[1], lead.tagColor[2]);
drawText(52, 174, lead.tag, 2, 255, 255, 255);
const leadHeadLines = wrapText(lead.headline, W - 80, 3);
let ly = 214;
for (const line of leadHeadLines) {
  drawText(40, ly, line, 3, INK[0], INK[1], INK[2]);
  ly += 26;
}
const leadBodyLines = wrapText(lead.body, W - 80, 2);
for (const line of leadBodyLines) {
  drawText(40, ly, line, 2, MUTED[0], MUTED[1], MUTED[2]);
  ly += 18;
}
fillRect(40, 356, W - 80, 2, INK[0], INK[1], INK[2]);

// Remaining stories in two columns.
const colW = 460;
const colGap = 24;
const colX = [40, 40 + colW + colGap];
const rowY = [380, 585, 790];
const rowH = 185;
for (let i = 1; i < STORIES.length; i++) {
  const s = STORIES[i];
  const col = (i - 1) % 2;
  const row = Math.floor((i - 1) / 2);
  const x = colX[col];
  const y = rowY[row];
  // Tag chip.
  const tagW = textWidth(s.tag, 2) + 16;
  fillRect(x, y, tagW, 26, s.tagColor[0], s.tagColor[1], s.tagColor[2]);
  drawText(x + 8, y + 5, s.tag, 2, 255, 255, 255);
  // Headline, wrapped.
  const headLines = wrapText(s.headline, colW, 2);
  let hy = y + 38;
  for (const line of headLines) {
    drawText(x, hy, line, 2, INK[0], INK[1], INK[2]);
    hy += 17;
  }
  // Body, wrapped.
  const bodyLines = wrapText(s.body, colW, 1);
  let by = hy + 6;
  for (const line of bodyLines) {
    drawText(x, by, line, 1, MUTED[0], MUTED[1], MUTED[2]);
    by += 10;
  }
  // Divider under each cell (except the last row).
  if (row < 2) fillRect(x, y + rowH - 8, colW, 1, 200, 192, 172);
}

// Footer.
fillRect(40, 978, W - 80, 2, INK[0], INK[1], INK[2]);
drawTextCentered(990, "SEVEN STORIES THAT DEFINED THE DAY  -  MAKE.FUN NEWS-IMAGE 21 NOV 2026", 1, MUTED[0], MUTED[1], MUTED[2]);

// ------------------------------------------------------------------- PNG ---
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/entry.png`, encodePNG());
console.log("wrote entry.png");
