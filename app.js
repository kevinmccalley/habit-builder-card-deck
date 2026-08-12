// Habit-Builder Card Deck — evergreen fixed-content deck. No quiz, no
// scoring: every buyer gets the same 44 cards from data.js, plus a
// personalized cover and up to 3 personalized goal cards built from a
// simple name + goals form. This is deliberately the shop's simplest
// wizard — see roadmap/product-roadmap.html's Now Building entry for why.
//
// Card-back customization (buyer-chosen pattern/color/photo) that every
// other GoodStockPress deck offers was deliberately left out of this v1
// scope — this product's personalization is the name+goals content, not
// the card back. A single fixed back design ships instead. Can be added
// later without touching the front-card logic if brand consistency
// becomes a priority.

const AUTH_API_BASE = "https://deck-of-us.vercel.app/api";
const ACCESS_TOKEN_KEY = "habitBuilderCardDeckToken";

let buyerName = "";
let goals = ["", "", ""];

// Guarded so this file can also be loaded headless (no `document`) by
// test-pdf-harness.js — the pure card-geometry functions below stay
// testable in plain Node without duplicating them into the test file.
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("passphrase-form").addEventListener("submit", handlePassphraseSubmit);
    document.getElementById("goals-form").addEventListener("submit", handleGoalsSubmit);
    document.getElementById("download-btn").addEventListener("click", downloadPdf);
    document.getElementById("start-over-btn").addEventListener("click", () => location.reload());
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
const ACCENT = [45, 110, 126];       // #2d6e7e — this product's own teal, distinct from every other deck's accent
const ACCENT_HEX = "#2d6e7e";
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

// --- Card-type drawing functions ------------------------------------------

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

  doc.setFont("Poppins", "normal");
  doc.setFontSize(8.7);
  doc.setTextColor(...INK);
  const bodyLines = doc.splitTextToSize(card.body, CARD_W - inset * 2);
  doc.text(bodyLines, cx, ty + 0.12, { align: "center", lineHeightFactor: 1.4 });

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

  doc.setFont("Poppins", "normal");
  doc.setFontSize(8.7);
  doc.setTextColor(...INK);
  const bodyLines = doc.splitTextToSize(card.body, CARD_W - inset * 2);
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

// --- Card back (fixed design — no buyer customization in v1) -------------

function drawCardBackPage(doc) {
  for (let i = 0; i < CARDS_PER_PAGE; i++) {
    const [x, y] = slotXY(i);
    doc.setFillColor(...ACCENT);
    doc.roundedRect(x, y, CARD_W, CARD_H, 0.08, 0.08, "F");

    // Subtle diagonal stripe texture — cheap to draw, reads as intentional
    // rather than a flat block of color.
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.006);
    const stripeSpacing = 0.16;
    for (let s = -CARD_H; s < CARD_W + CARD_H; s += stripeSpacing) {
      doc.line(x + s, y, x + s - CARD_H, y + CARD_H);
    }

    const cx = x + CARD_W / 2, cy = y + CARD_H / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx - 0.62, cy - 0.16, 1.24, 0.32, 0.05, 0.05, "F");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...ACCENT);
    centeredSpacedText(doc, SHOP_NAME.toUpperCase(), cx, cy + 0.03, 0.02);

    drawCropMarks(doc, x, y);
  }
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

async function preloadIcons() {
  const pngs = {};
  for (const cat of HABIT_DECK_DATA.promptCategories.map((c) => c.id)) {
    const svg = PHOSPHOR_ICONS_SVG[cat].replace(new RegExp(ACCENT_HEX, "g"), ACCENT_HEX);
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

  drawDeckCard.iconPngs = await preloadIcons();

  drawInstructionsPage(doc, buyerName);

  doc.addPage();
  drawCardBackPage(doc);

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
