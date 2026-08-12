// Habit-Builder Card Deck — evergreen fixed-content deck. No quiz, no
// scoring: every buyer gets the same 44 cards from data.js, plus a
// personalized cover and up to 3 personalized goal cards built from a
// simple name + goals form. This is deliberately the shop's simplest
// wizard for the FRONT content — see roadmap/product-roadmap.html's Now
// Building entry for why.
//
// Card-back customization (pattern/color/photo/text) uses the identical
// system every other GoodStockPress deck offers — ported verbatim from
// New Dad Survival Deck (2026-08-12, per Kevin's explicit request for
// parity, reversing an earlier scope cut). The buyer's chosen back color
// also drives the front faces (border, icon, category label) so both
// sides of the printed set match — same standing rule every deck follows.

const AUTH_API_BASE = "https://deck-of-us.vercel.app/api";
const ACCESS_TOKEN_KEY = "habitBuilderCardDeckToken";

let buyerName = "";
let goals = ["", "", ""];

let backPattern = "crosshatch";
let backColorId = "navy";
let backShowText = true;
let backPhoto = null;

// Guarded so this file can also be loaded headless (no `document`) by
// test-pdf-harness.js — the pure card-geometry functions below stay
// testable in plain Node without duplicating them into the test file.
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("passphrase-form").addEventListener("submit", handlePassphraseSubmit);
    document.getElementById("goals-form").addEventListener("submit", handleGoalsSubmit);
    document.getElementById("download-btn").addEventListener("click", downloadPdf);
    document.getElementById("start-over-btn").addEventListener("click", () => location.reload());

    renderBackSwatches();
    renderBackcardPreview();
    document.getElementById("backLabelInput").addEventListener("input", renderBackcardPreview);
    document.getElementById("backShowTextToggle").addEventListener("change", (e) => {
      backShowText = e.target.checked;
      renderBackcardPreview();
    });
    document.getElementById("addBackPhotoBtn").addEventListener("click", () => {
      document.getElementById("backPhotoInput").click();
    });
    document.getElementById("backPhotoInput").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      backPhoto = await processBackPhotoFile(file);
      renderBackcardPreview();
    });
    document.getElementById("removeBackPhotoBtn").addEventListener("click", () => {
      backPhoto = null;
      document.getElementById("backPhotoInput").value = "";
      renderBackcardPreview();
    });
  });
}

async function handlePassphraseSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("passphrase-input");
  const error = document.getElementById("passphrase-error");
  const button = e.target.querySelector("button[type=submit]");
  error.textContent = "";
  button.disabled = true;
  try {
    const resp = await fetch(`${AUTH_API_BASE}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: input.value.trim() }),
    });
    const data = await resp.json();
    if (resp.ok && data.token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.token);
      showScreen("form");
    } else {
      error.textContent = data.error || "That code doesn't match — check your order confirmation and try again.";
    }
  } catch {
    error.textContent = "Couldn't reach the server — check your connection and try again.";
  } finally {
    button.disabled = false;
  }
}

// On load: a `?token=` link (admin-minted) takes priority, then whatever's
// already saved from a prior successful claim. Same pattern every
// GoodStockPress wizard uses.
if (typeof document !== "undefined") {
  (async function checkExistingAccess() {
    const urlToken = new URLSearchParams(location.search).get("token");
    const token = urlToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    try {
      const resp = await fetch(`${AUTH_API_BASE}/verify-token?token=${encodeURIComponent(token)}`);
      const data = await resp.json();
      if (data.valid) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        showScreen("form");
      }
    } catch {
      // Network hiccup on load — fall back to showing the gate screen as normal.
    }
  })();
}

function handleGoalsSubmit(e) {
  e.preventDefault();
  buyerName = document.getElementById("buyer-name").value.trim();
  goals = [
    document.getElementById("goal-1").value.trim(),
    document.getElementById("goal-2").value.trim(),
    document.getElementById("goal-3").value.trim(),
  ];
  document.getElementById("results-name").textContent = buyerName ? `${buyerName}'s Deck Is Ready` : "Your Deck Is Ready";
  showScreen("results");
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  document.getElementById(`screen-${name}`).classList.add("active");
}

// --- Card geometry & shared drawing helpers -------------------------------

const CARD_W = 2.5, CARD_H = 3.5;
const COLS = 2, ROWS = 3;
const MARGIN_X = 1.5, GAP_X = 0.5;
const MARGIN_Y = 0.2, GAP_Y = 0.05;
const CARDS_PER_PAGE = COLS * ROWS;

const INK = [35, 40, 42];
// Reassigned in downloadPdf() from the buyer's chosen back color — starts
// as this product's own teal default so the results-screen preview (which
// doesn't call downloadPdf) still has a sane value. Mutable rather than
// threaded as an explicit parameter through every draw function: safe
// because exactly one PDF is ever built at a time, synchronously.
let ACCENT = [45, 110, 126];       // #2d6e7e default
const ICON_PLACEHOLDER_HEX = "#2d6e7e"; // baked into phosphor-icons.js's SVG fill, swapped for the real accent at build time
const DIVIDER = [215, 222, 220];
const CROP_MARK = [180, 180, 180];
const MUTED = [138, 147, 143];

const SHOP_NAME = "GoodStockPress";
const PRODUCT_NAME = "Habit-Builder Card Deck";

function slotXY(posOnPage) {
  const row = Math.floor(posOnPage / COLS);
  const col = posOnPage % COLS;
  return [MARGIN_X + col * (CARD_W + GAP_X), MARGIN_Y + row * (CARD_H + GAP_Y)];
}

function drawCropMarks(doc, x, y) {
  const markLen = 0.12;
  const gap = 0.04;
  doc.setDrawColor(...CROP_MARK);
  doc.setLineWidth(0.006);
  [
    [x, y, -1, -1],
    [x + CARD_W, y, 1, -1],
    [x, y + CARD_H, -1, 1],
    [x + CARD_W, y + CARD_H, 1, 1],
  ].forEach(([cx0, cy0, dx, dy]) => {
    doc.line(cx0 + dx * gap, cy0, cx0 + dx * (gap + markLen), cy0);
    doc.line(cx0, cy0 + dy * gap, cx0, cy0 + dy * (gap + markLen));
  });
}

// jsPDF's align:"center" doesn't account for charSpace when computing text
// width, so letter-spaced centered text renders shifted right of true
// center. Measures and centers manually instead (same fix used shop-wide).
function centeredSpacedText(doc, text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map((ch) => doc.getTextWidth(ch));
  const totalWidth = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - totalWidth / 2;
  chars.forEach((ch, i) => {
    doc.text(ch, x, y);
    x += widths[i] + spacing;
  });
}

function spacedTextWidth(doc, text, spacing) {
  const chars = [...text];
  return chars.map((ch) => doc.getTextWidth(ch)).reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
}

// Shrinks a body paragraph's font size until its wrapped line count fits
// within maxHeight, rather than trusting a fixed font size never to
// overflow — found via the real browser pass (2026-08-12) that every
// framework card's body text was colliding with the footer tag: the
// Helvetica-proxied Node harness never caught it because Poppins wraps
// differently at the same nominal size. Same class of bug Wedding Party
// Cards hit and fixed the same way.
function fitParagraph(doc, text, maxWidth, maxHeight, startSize, minSize, lineHeightFactor) {
  let size = startSize;
  doc.setFont("Poppins", "normal");
  while (size > minSize) {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    const blockHeight = lines.length * (size / 72) * lineHeightFactor;
    if (blockHeight <= maxHeight) return { size, lines };
    size -= 0.3;
  }
  doc.setFontSize(minSize);
  return { size: minSize, lines: doc.splitTextToSize(text, maxWidth) };
}

function cardFrame(doc, x, y) {
  drawCropMarks(doc, x, y);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.014);
  doc.roundedRect(x, y, CARD_W, CARD_H, 0.08, 0.08, "S");
}

function footerTag(doc, cx, bottomY) {
  doc.setFont("Poppins", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  centeredSpacedText(doc, SHOP_NAME.toUpperCase(), cx, bottomY, 0.02);
}

// --- Card-type drawing functions (fronts) ----------------------------------

function drawCoverCard(doc, x, y, name) {
  cardFrame(doc, x, y);
  const cx = x + CARD_W / 2;
  doc.setFont("Poppins", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...ACCENT);
  centeredSpacedText(doc, "HABIT-BUILDER DECK", cx, y + 0.55, 0.03);

  doc.setFont("Poppins", "bold");
  doc.setFontSize(name ? 22 : 19);
  doc.setTextColor(...INK);
  const title = name ? `${name}'s Deck` : "Small Habits.\nReal Change.";
  const lines = title.split("\n");
  let ty = y + CARD_H / 2 - (lines.length - 1) * 0.14;
  lines.forEach((line) => {
    doc.text(line, cx, ty, { align: "center" });
    ty += 0.28;
  });

  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.01);
  doc.line(x + 0.5, y + CARD_H - 0.55, x + CARD_W - 0.5, y + CARD_H - 0.55);
  footerTag(doc, cx, y + CARD_H - 0.28);
}

function drawFrameworkCard(doc, x, y, card) {
  cardFrame(doc, x, y);
  const cx = x + CARD_W / 2;
  const inset = 0.28;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...ACCENT);
  centeredSpacedText(doc, "THE FRAMEWORK", cx, y + 0.34, 0.03);

  doc.setFont("Poppins", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(card.title, CARD_W - inset * 2);
  let ty = y + 0.68;
  doc.text(titleLines, cx, ty, { align: "center", lineHeightFactor: 1.25 });
  ty += titleLines.length * 0.22 + 0.18;

  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.01);
  doc.line(x + inset, ty - 0.1, x + CARD_W - inset, ty - 0.1);

  const bodyTop = ty + 0.12;
  const bodyMaxHeight = (y + CARD_H - 0.34) - bodyTop; // leaves clearance above the footer tag
  const { size: bodySize, lines: bodyLines } = fitParagraph(doc, card.body, CARD_W - inset * 2, bodyMaxHeight, 8.7, 6.5, 1.4);
  doc.setFont("Poppins", "normal");
  doc.setFontSize(bodySize);
  doc.setTextColor(...INK);
  doc.text(bodyLines, cx, bodyTop, { align: "center", lineHeightFactor: 1.4 });

  footerTag(doc, cx, y + CARD_H - 0.22);
}

function drawPromptCard(doc, x, y, card, iconPngs, categoryLabel) {
  cardFrame(doc, x, y);
  const cx = x + CARD_W / 2;
  const inset = 0.26;

  const iconSize = 0.42;
  doc.addImage(iconPngs[card.category], "PNG", cx - iconSize / 2, y + 0.24, iconSize, iconSize);

  doc.setFont("Poppins", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...ACCENT);
  centeredSpacedText(doc, categoryLabel.toUpperCase(), cx, y + 0.86, 0.025);

  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.01);
  doc.line(x + inset, y + 0.98, x + CARD_W - inset, y + 0.98);

  let ty = y + 1.24;
  const rows = [["CUE", card.cue], ["ROUTINE", card.routine], ["REWARD", card.reward]];
  rows.forEach(([label, text]) => {
    doc.setFont("Poppins", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...ACCENT);
    doc.text(label, x + inset, ty);
    ty += 0.16;

    doc.setFont("Poppins", "normal");
    doc.setFontSize(8.3);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(text, CARD_W - inset * 2);
    doc.text(lines, x + inset, ty, { lineHeightFactor: 1.3 });
    ty += lines.length * 0.145 + 0.18;
  });

  footerTag(doc, cx, y + CARD_H - 0.2);
}

function drawGridTracker(doc, x, y, count, cols, title, body) {
  cardFrame(doc, x, y);
  const cx = x + CARD_W / 2;
  const inset = 0.26;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text(title, cx, y + 0.4, { align: "center" });

  doc.setFont("Poppins", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(...MUTED);
  const bodyLines = doc.splitTextToSize(body, CARD_W - inset * 2);
  doc.text(bodyLines, cx, y + 0.58, { align: "center", lineHeightFactor: 1.3 });

  const gridTop = y + 0.58 + bodyLines.length * 0.13 + 0.16;
  const gridBottom = y + CARD_H - 0.3;
  const rows = Math.ceil(count / cols);
  const boxGap = 0.06;
  const boxSize = Math.min(
    (CARD_W - inset * 2 - boxGap * (cols - 1)) / cols,
    (gridBottom - gridTop - boxGap * (rows - 1)) / rows
  );
  const gridW = boxSize * cols + boxGap * (cols - 1);
  const startX = cx - gridW / 2;

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.012);
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const bx = startX + c * (boxSize + boxGap);
    const by = gridTop + r * (boxSize + boxGap);
    doc.roundedRect(bx, by, boxSize, boxSize, 0.02, 0.02, "S");
    if (boxSize > 0.22) {
      doc.setFont("Poppins", "normal");
      doc.setFontSize(5.2);
      doc.setTextColor(...MUTED);
      doc.text(String(i + 1), bx + boxSize / 2, by + boxSize / 2 + 0.02, { align: "center" });
    }
  }

  footerTag(doc, cx, y + CARD_H - 0.2);
}

function drawMilestoneTracker(doc, x, y, card) {
  cardFrame(doc, x, y);
  const cx = x + CARD_W / 2;
  const inset = 0.3;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...ACCENT);
  centeredSpacedText(doc, "MILESTONE", cx, y + 0.42, 0.03);

  const dayMatch = card.title.match(/Day (\d+)/);
  doc.setFont("Poppins", "bold");
  doc.setFontSize(38);
  doc.setTextColor(...INK);
  doc.text(dayMatch ? dayMatch[1] : "—", cx, y + 1.35, { align: "center" });

  doc.setFont("Poppins", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...ACCENT);
  doc.text(card.title.replace(/^Day \d+ . /, "").toUpperCase(), cx, y + 1.7, { align: "center" });

  doc.setFont("Poppins", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(card.body, CARD_W - inset * 2);
  doc.text(lines, cx, y + 2.15, { align: "center", lineHeightFactor: 1.4 });

  footerTag(doc, cx, y + CARD_H - 0.22);
}

function drawTrackerCard(doc, x, y, card) {
  if (card.format === "grid-30") return drawGridTracker(doc, x, y, 30, 5, card.title, card.body);
  if (card.format === "grid-7") return drawGridTracker(doc, x, y, 7, 7, card.title, card.body);
  if (card.format === "calendar-month") return drawGridTracker(doc, x, y, 31, 7, card.title, card.body);
  return drawMilestoneTracker(doc, x, y, card);
}

function drawReflectionCard(doc, x, y, card) {
  cardFrame(doc, x, y);
  const cx = x + CARD_W / 2;
  const inset = 0.3;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...ACCENT);
  centeredSpacedText(doc, "IF IT DOESN'T GO PERFECTLY", cx, y + 0.4, 0.02);

  doc.setFont("Poppins", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(card.title, CARD_W - inset * 2);
  let ty = y + 0.75;
  doc.text(titleLines, cx, ty, { align: "center", lineHeightFactor: 1.25 });
  ty += titleLines.length * 0.2 + 0.22;

  const bodyMaxHeight = (y + CARD_H - 0.34) - ty;
  const { size: bodySize, lines: bodyLines } = fitParagraph(doc, card.body, CARD_W - inset * 2, bodyMaxHeight, 8.7, 6.5, 1.4);
  doc.setFont("Poppins", "normal");
  doc.setFontSize(bodySize);
  doc.setTextColor(...INK);
  doc.text(bodyLines, cx, ty, { align: "center", lineHeightFactor: 1.4 });

  footerTag(doc, cx, y + CARD_H - 0.22);
}

function drawGoalCard(doc, x, y, goalText, index) {
  cardFrame(doc, x, y);
  const cx = x + CARD_W / 2;
  const inset = 0.28;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...ACCENT);
  centeredSpacedText(doc, `MY GOAL ${index + 1}`, cx, y + 0.5, 0.03);

  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.01);
  doc.line(x + inset, y + 0.68, x + CARD_W - inset, y + 0.68);

  const text = goalText || "Write in your own habit or goal";
  doc.setFont("Poppins", goalText ? "bold" : "normal");
  doc.setFontSize(goalText ? 13 : 10);
  doc.setTextColor(...(goalText ? INK : MUTED));
  const lines = doc.splitTextToSize(text, CARD_W - inset * 2);
  const blockH = lines.length * 0.22;
  doc.text(lines, cx, y + CARD_H / 2 - blockH / 2 + 0.55, { align: "center", lineHeightFactor: 1.35 });

  footerTag(doc, cx, y + CARD_H - 0.22);
}

function drawMotivationCard(doc, x, y, card) {
  cardFrame(doc, x, y);
  const cx = x + CARD_W / 2;
  const inset = 0.3;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...ACCENT);
  doc.text("“", cx, y + 0.65, { align: "center" });

  doc.setFont("Poppins", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(card.body, CARD_W - inset * 2);
  const blockH = lines.length * 0.24;
  doc.text(lines, cx, y + CARD_H / 2 - blockH / 2 + 0.1, { align: "center", lineHeightFactor: 1.45 });

  footerTag(doc, cx, y + CARD_H - 0.22);
}

function drawInstructionsPage(doc, name) {
  const pageW = 8.5;
  const marginX = 1;
  let y = 1.1;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text("How to Print Your Cards", pageW / 2, y, { align: "center" });
  y += 0.3;

  doc.setFont("Poppins", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.text(name ? `For ${name}` : "For You", pageW / 2, y, { align: "center" });
  y += 0.6;

  const sections = [
    ["Paper", "Use heavyweight cardstock (80–110 lb cover, roughly 200–300 gsm) for a sturdy, shuffle-ready feel. Regular printer paper works fine too if you just want to try these out first."],
    ["Printer settings", "Paper size: Letter (8.5 x 11 in)  ·  Orientation: Portrait  ·  Scale: 100% / Actual Size. Do NOT use “Fit to Page” or “Shrink to Fit” — that will print your cards smaller than 2.5 x 3.5 in."],
    ["Cutting", "Cut along the small corner guide marks just outside each card. A paper cutter or a ruler + craft knife gives the straightest edges; scissors work fine too — cut just inside the guide marks rather than on the printed border itself."],
    ["Finished size", "Each card finishes at 2.5 x 3.5 in — standard poker/tarot card size — so they'll fit any standard card sleeve if you'd like to keep them together as a keepsake."],
    ["Tracker cards", "The 30-day, weekly, and monthly tracker cards are meant to be reused — mark them with a pen, wipe or reprint when you're ready to start a fresh cycle."],
  ];

  sections.forEach(([heading, body]) => {
    doc.setFont("Poppins", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ACCENT);
    doc.text(heading, marginX, y);
    y += 0.25;

    doc.setFont("Poppins", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(body, pageW - marginX * 2);
    doc.text(lines, marginX, y, { lineHeightFactor: 1.4 });
    y += lines.length * 0.19 + 0.35;
  });
}

// --- Card back customization (ported from New Dad Survival Deck — same
// pattern library, colors, and drawing logic every GoodStockPress deck
// offers, per Kevin's explicit request 2026-08-12 for full parity) --------

const BACK_COLORS = [
  { id: "brass", label: "Brass", rgb: [169, 122, 63], hex: "#a97a3f", textHex: "#8a611f" },
  { id: "ink", label: "Ink", rgb: [28, 23, 18], hex: "#1c1712" },
  { id: "red", label: "Red", rgb: [176, 40, 38], hex: "#b02826" },
  { id: "purple", label: "Purple", rgb: [91, 58, 114], hex: "#5b3a72" },
  { id: "navy", label: "Navy", rgb: [30, 58, 95], hex: "#1e3a5f" },
];
const BACK_PATTERNS = [
  { id: "crosshatch", label: "Crosshatch", group: "modern" },
  { id: "stripes", label: "Stripes", group: "modern" },
  { id: "dots", label: "Dots", group: "modern" },
  { id: "grid", label: "Grid", group: "modern" },
  { id: "chevron", label: "Chevron", group: "modern" },
  { id: "fleur", label: "Fleur-de-Lis", group: "classic" },
  { id: "quatrefoil", label: "Quatrefoil", group: "classic" },
  { id: "scroll", label: "Scrollwork", group: "classic" },
  { id: "rosette", label: "Rosette", group: "classic" },
  { id: "trellis", label: "Diamond Trellis", group: "classic" },
];
const BACK_INSET = 0.14;
const BACK_INNER_ASPECT = (CARD_W - BACK_INSET * 2) / (CARD_H - BACK_INSET * 2);

function fillClosedPath(doc, points) {
  const deltas = [];
  for (let i = 1; i < points.length; i++) {
    deltas.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
  }
  doc.lines(deltas, points[0][0], points[0][1], [1, 1], "F", true);
}

function heartPoints(cx, cy, r, pointDown) {
  const N = 48;
  const raw = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    raw.push([x, y]);
  }
  const xMax = Math.max(...raw.map((p) => Math.abs(p[0])));
  const ys = raw.map((p) => p[1]);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const yCenter = (yMin + yMax) / 2;
  const sx = (r * 0.95) / xMax;
  const sy = (r * 0.95) / ((yMax - yMin) / 2);
  return raw.map(([x, y]) => {
    const centered = (y - yCenter) * sy;
    const dy = pointDown ? -centered : centered;
    return [cx + x * sx, cy + dy];
  });
}

const BACK_PATTERN_DRAW = {
  crosshatch(doc, ix, iy, iw, ih, color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.007);
    const step = 0.17;
    for (let d = -ih; d <= iw + ih; d += step) {
      doc.line(ix + d, iy, ix + d + ih, iy + ih);
      doc.line(ix + d, iy, ix + d - ih, iy + ih);
    }
  },
  stripes(doc, ix, iy, iw, ih, color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.009);
    const step = 0.15;
    for (let d = -ih; d <= iw + ih; d += step) {
      doc.line(ix + d, iy, ix + d + ih, iy + ih);
    }
  },
  dots(doc, ix, iy, iw, ih, color) {
    doc.setFillColor(...color);
    const step = 0.17, r = 0.03;
    for (let yy = iy + step / 2; yy <= iy + ih; yy += step) {
      for (let xx = ix + step / 2; xx <= ix + iw; xx += step) {
        doc.circle(xx, yy, r, "F");
      }
    }
  },
  grid(doc, ix, iy, iw, ih, color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.007);
    const step = 0.17;
    for (let xx = ix; xx <= ix + iw; xx += step) doc.line(xx, iy, xx, iy + ih);
    for (let yy = iy; yy <= iy + ih; yy += step) doc.line(ix, yy, ix + iw, yy);
  },
  chevron(doc, ix, iy, iw, ih, color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.012);
    const stepX = 0.15, amp = 0.09, rowH = amp * 2;
    for (let rowY = iy; rowY <= iy + ih + rowH; rowY += rowH) {
      let prevX = ix - stepX, prevY = rowY, up = true;
      for (let xx = ix - stepX; xx <= ix + iw + stepX; xx += stepX) {
        const yPos = up ? rowY - amp : rowY + amp;
        doc.line(prevX, prevY, xx, yPos);
        prevX = xx;
        prevY = yPos;
        up = !up;
      }
    }
  },
  fleur(doc, ix, iy, iw, ih, color) {
    doc.setFillColor(...color);
    const step = 0.36, R = 0.09;
    for (let yy = iy + step / 2; yy <= iy + ih; yy += step) {
      for (let xx = ix + step / 2; xx <= ix + iw; xx += step) {
        fillClosedPath(doc, heartPoints(xx, yy - R * 0.35, R, false));
        doc.circle(xx - R * 0.85, yy + R * 0.15, R * 0.38, "F");
        doc.circle(xx + R * 0.85, yy + R * 0.15, R * 0.38, "F");
        doc.rect(xx - R * 0.95, yy + R * 0.55, R * 1.9, R * 0.22, "F");
        fillClosedPath(doc, [
          [xx, yy + R * 1.05],
          [xx + R * 0.22, yy + R * 0.77],
          [xx - R * 0.22, yy + R * 0.77],
        ]);
      }
    }
  },
  quatrefoil(doc, ix, iy, iw, ih, color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.01);
    doc.setFillColor(...color);
    const step = 0.34, off = 0.071, r = 0.059;
    for (let yy = iy - step; yy <= iy + ih + step; yy += step) {
      for (let xx = ix - step; xx <= ix + iw + step; xx += step) {
        doc.circle(xx, yy - off, r, "S");
        doc.circle(xx, yy + off, r, "S");
        doc.circle(xx - off, yy, r, "S");
        doc.circle(xx + off, yy, r, "S");
        doc.circle(xx, yy, 0.013, "F");
      }
    }
  },
  scroll(doc, ix, iy, iw, ih, color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.013);
    doc.setFillColor(...color);
    const waveW = 0.42, amp = 0.09, rowH = 0.24, sampleStep = waveW / 8;
    for (let rowY = iy; rowY <= iy + ih + rowH; rowY += rowH) {
      let prevX = ix - waveW, prevY = rowY;
      for (let xx = ix - waveW; xx <= ix + iw + waveW; xx += sampleStep) {
        const t = ((xx - (ix - waveW)) / waveW) * Math.PI;
        const yy = rowY - amp * Math.sin(t);
        doc.line(prevX, prevY, xx, yy);
        prevX = xx;
        prevY = yy;
      }
      let bud = 0;
      for (let xx = ix - waveW / 2; xx <= ix + iw + waveW; xx += waveW) {
        doc.circle(xx, rowY - (bud % 2 === 0 ? amp : -amp), 0.02, "F");
        bud++;
      }
    }
  },
  rosette(doc, ix, iy, iw, ih, color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.009);
    doc.setFillColor(...color);
    const step = 0.32, R = 0.11, d = R * 0.707;
    for (let yy = iy + step / 2; yy <= iy + ih; yy += step) {
      for (let xx = ix + step / 2; xx <= ix + iw; xx += step) {
        doc.line(xx, yy - R, xx, yy + R);
        doc.line(xx - R, yy, xx + R, yy);
        doc.line(xx - d, yy - d, xx + d, yy + d);
        doc.line(xx + d, yy - d, xx - d, yy + d);
        doc.circle(xx, yy, R, "S");
        doc.circle(xx, yy, 0.02, "F");
      }
    }
  },
  trellis(doc, ix, iy, iw, ih, color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.011);
    doc.setFillColor(...color);
    const step = 0.34, s = step / 2;
    for (let yy = iy - step; yy <= iy + ih + step; yy += step) {
      for (let xx = ix - step; xx <= ix + iw + step; xx += step) {
        const cx = xx + s, cy = yy + s;
        doc.lines([[s, s], [-s, s], [-s, -s]], cx, cy - s, [1, 1], "S", true);
        doc.circle(cx, cy, 0.025, "F");
      }
    }
  },
};

function backPatternDataUri(patternId, colorHex) {
  const svgs = {
    crosshatch: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M0 24L24 0M-3 3L3-3M21 27L27 21M0 0L24 24M-3 21L3 27M21 -3L27 3" stroke="${colorHex}" stroke-width="1.1" fill="none"/></svg>`,
    stripes: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M-2 2L2-2M0 16L16 0M14 18L18 14" stroke="${colorHex}" stroke-width="1.3" fill="none"/></svg>`,
    dots: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="1.6" fill="${colorHex}"/></svg>`,
    grid: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><path d="M14 0H0V14" stroke="${colorHex}" stroke-width="1" fill="none"/></svg>`,
    chevron: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="14"><path d="M0 10L7 3L14 10L21 3L28 10" stroke="${colorHex}" stroke-width="1.4" fill="none"/></svg>`,
    fleur: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><g fill="${colorHex}"><path d="M15 3C19 7 19 13 15 15C11 13 11 7 15 3Z"/><circle cx="7.5" cy="15.5" r="3"/><circle cx="22.5" cy="15.5" r="3"/><rect x="6" y="17.5" width="18" height="2.2" rx="1"/><path d="M15 26L18.5 19.5L11.5 19.5Z"/></g></svg>`,
    quatrefoil: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="${colorHex}" stroke-width="1"><circle cx="12" cy="7.2" r="4.2"/><circle cx="12" cy="16.8" r="4.2"/><circle cx="7.2" cy="12" r="4.2"/><circle cx="16.8" cy="12" r="4.2"/></g><circle cx="12" cy="12" r="1" fill="${colorHex}"/></svg>`,
    scroll: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><path d="M0 10Q10 0 20 10T40 10" stroke="${colorHex}" stroke-width="1.3" fill="none"/><circle cx="10" cy="2" r="1.8" fill="${colorHex}"/><circle cx="30" cy="18" r="1.8" fill="${colorHex}"/></svg>`,
    rosette: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><g stroke="${colorHex}" stroke-width="1" fill="none"><path d="M13 3L13 23M3 13L23 13M5.9 5.9L20.1 20.1M20.1 5.9L5.9 20.1"/><circle cx="13" cy="13" r="9"/></g><circle cx="13" cy="13" r="1.8" fill="${colorHex}"/></svg>`,
    trellis: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M14 0L28 14L14 28L0 14Z" stroke="${colorHex}" stroke-width="1" fill="none"/><circle cx="14" cy="14" r="2" fill="${colorHex}"/></svg>`,
  };
  return `url(data:image/svg+xml,${encodeURIComponent(svgs[patternId] || svgs.crosshatch)})`;
}

function renderBackcardPreview() {
  const preview = document.getElementById("backcardPreview");
  const color = BACK_COLORS.find((c) => c.id === backColorId) || BACK_COLORS[0];

  if (backPhoto) {
    preview.style.backgroundImage = `url(${backPhoto})`;
    preview.classList.add("has-photo");
  } else {
    preview.style.backgroundImage = backPatternDataUri(backPattern, color.hex);
    preview.classList.remove("has-photo");
  }
  document.getElementById("removeBackPhotoBtn").style.display = backPhoto ? "inline-flex" : "none";

  const plate = document.getElementById("backcardPlate");
  const label = document.getElementById("backLabelInput").value.trim();
  plate.textContent = (label || SHOP_NAME).toUpperCase();
  plate.style.display = backShowText ? "" : "none";
  plate.style.color = color.textHex || color.hex;
  plate.style.borderColor = color.hex;

  document.getElementById("backLabelGroup").classList.toggle("disabled", !backShowText);
}

function renderBackSwatches() {
  const color = BACK_COLORS.find((c) => c.id === backColorId) || BACK_COLORS[0];

  const patternRow = document.getElementById("patternSwatches");
  const patternGroups = [["modern", "Modern"], ["classic", "Classic"]];
  patternRow.innerHTML = patternGroups.map(([groupId, groupLabel]) => `
    <div class="swatch-subgroup">
      <span class="swatch-subgroup-label">${groupLabel}</span>
      <div class="swatch-row">
        ${BACK_PATTERNS.filter((p) => p.group === groupId).map((p) => {
          const active = p.id === backPattern ? " active" : "";
          return `<button type="button" class="swatch pattern-swatch${active}" data-pattern="${p.id}" title="${p.label}" aria-label="${p.label} pattern" style="background-image:${backPatternDataUri(p.id, color.hex)}"></button>`;
        }).join("")}
      </div>
    </div>
  `).join("");
  patternRow.querySelectorAll(".pattern-swatch").forEach((btn) => {
    btn.addEventListener("click", () => {
      backPattern = btn.getAttribute("data-pattern");
      renderBackSwatches();
      renderBackcardPreview();
    });
  });

  const colorRow = document.getElementById("colorSwatches");
  colorRow.innerHTML = BACK_COLORS.map((c) => {
    const active = c.id === backColorId ? " active" : "";
    return `<button type="button" class="swatch color-swatch${active}" data-color="${c.id}" title="${c.label}" aria-label="${c.label} color" style="background-color:${c.hex}"></button>`;
  }).join("");
  colorRow.querySelectorAll(".color-swatch").forEach((btn) => {
    btn.addEventListener("click", () => {
      backColorId = btn.getAttribute("data-color");
      renderBackSwatches();
      renderBackcardPreview();
    });
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function cropImageToDataUrl(img, targetAspect, outW, outH) {
  const imgAspect = img.width / img.height;
  let sx, sy, sw, sh;
  if (imgAspect > targetAspect) {
    sh = img.height;
    sw = sh * targetAspect;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / targetAspect;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function processBackPhotoFile(file) {
  const img = await loadImageFile(file);
  const outW = 820;
  return cropImageToDataUrl(img, BACK_INNER_ASPECT, outW, Math.round(outW / BACK_INNER_ASPECT));
}

// One extra page: 6 identical "back of card" tiles in the exact same
// COLS/ROWS/MARGIN/GAP grid as the fronts, so this one page can be
// reprinted on the reverse of any front sheet.
function drawCardBackTile(doc, x, y, label, photo, patternId, color, showText) {
  drawCropMarks(doc, x, y);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.014);
  doc.roundedRect(x, y, CARD_W, CARD_H, 0.08, 0.08, "S");

  const inset = BACK_INSET;
  const ix = x + inset, iy = y + inset, iw = CARD_W - inset * 2, ih = CARD_H - inset * 2;
  doc.setLineWidth(0.006);
  doc.roundedRect(ix, iy, iw, ih, 0.05, 0.05, "S");

  if (photo) {
    doc.saveGraphicsState();
    doc.roundedRect(ix, iy, iw, ih, 0.05, 0.05, null);
    doc.clip();
    doc.discardPath();
    doc.addImage(photo, "JPEG", ix, iy, iw, ih);
    doc.restoreGraphicsState();
  } else {
    doc.saveGraphicsState();
    doc.roundedRect(ix, iy, iw, ih, 0.05, 0.05, null);
    doc.clip();
    doc.discardPath();
    (BACK_PATTERN_DRAW[patternId] || BACK_PATTERN_DRAW.crosshatch)(doc, ix, iy, iw, ih, color);
    doc.restoreGraphicsState();
  }

  if (!showText) return;

  const cx = x + CARD_W / 2, cy = y + CARD_H / 2;
  const plateH = 0.34;
  const spacing = 0.012;
  const maxPlateW = iw - 0.3;
  const labelText = (label || SHOP_NAME).toUpperCase();

  doc.setFont("Poppins", "bold");
  let fontSize = 8.5;
  doc.setFontSize(fontSize);
  while (spacedTextWidth(doc, labelText, spacing) + 0.36 > maxPlateW && fontSize > 6) {
    fontSize -= 0.5;
    doc.setFontSize(fontSize);
  }
  const plateW = Math.min(maxPlateW, Math.max(1.1, spacedTextWidth(doc, labelText, spacing) + 0.36));

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cx - plateW / 2, cy - plateH / 2, plateW, plateH, 0.05, 0.05, "F");
  doc.setDrawColor(...color);
  doc.setLineWidth(0.012);
  doc.roundedRect(cx - plateW / 2, cy - plateH / 2, plateW, plateH, 0.05, 0.05, "S");
  doc.setTextColor(...color);
  // Font-relative baseline offset (jsPDF anchors text at its baseline, not
  // its visual center) — see Deck of Us's app.js for the full derivation.
  const vOffset = (fontSize / 72) * 0.34;
  centeredSpacedText(doc, labelText, cx, cy + vOffset, spacing);
}

function drawCardBackPage(doc, label, photo, patternId, color, showText) {
  for (let pos = 0; pos < CARDS_PER_PAGE; pos++) {
    const [x, y] = slotXY(pos);
    drawCardBackTile(doc, x, y, label, photo, patternId, color, showText);
  }

  const marginX = 0.2;
  const colW = MARGIN_X - marginX * 2;
  let y = 0.7;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  const headingLines = doc.splitTextToSize("Card Backs", colW);
  doc.text(headingLines, marginX, y, { lineHeightFactor: 1.25 });
  y += headingLines.length * 0.22 + 0.35;

  const sections = [
    "This page is the card back — the same design repeats behind every card in your deck.",
    "To print two-sided: print your card-front pages first, then run the same paper back through your printer with this page selected, printing it on the reverse of each sheet.",
    "Test one sheet first — printers vary, so check your printer's manual duplex guide for the correct paper orientation before running the whole deck.",
  ];

  doc.setFont("Poppins", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  sections.forEach((text) => {
    const lines = doc.splitTextToSize(text, colW);
    doc.text(lines, marginX, y, { lineHeightFactor: 1.4 });
    y += lines.length * 0.155 + 0.28;
  });
}

// --- Icon rasterization (jsPDF can't draw SVG paths directly) -------------

function svgToPngDataUrl(svgString, pxSize) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = pxSize;
    canvas.height = pxSize;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, pxSize, pxSize);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function preloadIcons(accentHex) {
  const pngs = {};
  for (const cat of HABIT_DECK_DATA.promptCategories.map((c) => c.id)) {
    const svg = PHOSPHOR_ICONS_SVG[cat].replace(new RegExp(ICON_PLACEHOLDER_HEX, "g"), accentHex);
    pngs[cat] = await svgToPngDataUrl(svg, 240);
  }
  return pngs;
}

// --- Deck assembly ----------------------------------------------------------
// Fixed order for every buyer: cover, framework, the buyer's own goal
// cards, categorized prompts, trackers, reflection, motivation. Goal cards
// sit early (right after the framework) so a buyer's own stated goal is
// front and center before they get to the generic prompt-card library.

function buildDeck() {
  const cards = [];
  cards.push({ type: "cover" });
  HABIT_DECK_DATA.framework.forEach((c) => cards.push({ type: "framework", card: c }));
  goals.forEach((g, i) => cards.push({ type: "goal", text: g, index: i }));
  HABIT_DECK_DATA.promptCategories.forEach((cat) => {
    HABIT_DECK_DATA.prompts.filter((p) => p.category === cat.id).forEach((p) => {
      cards.push({ type: "prompt", card: p, categoryLabel: cat.label });
    });
  });
  HABIT_DECK_DATA.trackers.forEach((c) => cards.push({ type: "tracker", card: c }));
  HABIT_DECK_DATA.reflection.forEach((c) => cards.push({ type: "reflection", card: c }));
  HABIT_DECK_DATA.motivation.forEach((c) => cards.push({ type: "motivation", card: c }));
  return cards;
}

function drawDeckCard(doc, x, y, entry) {
  switch (entry.type) {
    case "cover": return drawCoverCard(doc, x, y, buyerName);
    case "framework": return drawFrameworkCard(doc, x, y, entry.card);
    case "goal": return drawGoalCard(doc, x, y, entry.text, entry.index);
    case "prompt": return drawPromptCard(doc, x, y, entry.card, drawDeckCard.iconPngs, entry.categoryLabel);
    case "tracker": return drawTrackerCard(doc, x, y, entry.card);
    case "reflection": return drawReflectionCard(doc, x, y, entry.card);
    case "motivation": return drawMotivationCard(doc, x, y, entry.card);
  }
}

async function downloadPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "in", format: "letter" });

  doc.addFileToVFS("Poppins-Regular.ttf", POPPINS_REGULAR_BASE64);
  doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
  doc.addFileToVFS("Poppins-SemiBold.ttf", POPPINS_SEMIBOLD_BASE64);
  doc.addFont("Poppins-SemiBold.ttf", "Poppins", "bold");

  doc.setProperties({ title: buyerName ? `${buyerName}'s Habit-Builder Deck` : "Habit-Builder Deck" });

  // Buyer's chosen card-back color also drives the front faces (border,
  // icon, category label) so both sides of the printed set match — same
  // standing rule every GoodStockPress deck follows.
  const accentColor = BACK_COLORS.find((c) => c.id === backColorId) || BACK_COLORS[0];
  ACCENT = accentColor.rgb;
  drawDeckCard.iconPngs = await preloadIcons(accentColor.hex);

  drawInstructionsPage(doc, buyerName);

  doc.addPage();
  const backLabel = document.getElementById("backLabelInput").value.trim();
  drawCardBackPage(doc, backLabel, backPhoto, backPattern, ACCENT, backShowText);

  const deck = buildDeck();
  deck.forEach((entry, i) => {
    const posOnPage = i % CARDS_PER_PAGE;
    if (posOnPage === 0) doc.addPage();
    const [x, y] = slotXY(posOnPage);
    drawDeckCard(doc, x, y, entry);
  });

  const filename = buyerName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${filename || "habit-builder"}-deck.pdf`);
}
