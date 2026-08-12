// Node-only smoke test, no browser. Verifies the content bank's structure
// against the locked 48-card architecture, then loads the REAL app.js
// (guarded so it's safe without `document`) to generate an actual PDF
// using its real drawing functions — not a duplicated copy of the logic —
// and checks page counts. Run: node test-pdf-harness.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { jsPDF } = require("jspdf");

const DIR = __dirname;

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.log("FAIL: " + msg); } else { console.log("OK: " + msg); }
}

// --- Load data.js and app.js into one shared sandbox ----------------------
// `document` is deliberately left undefined — app.js guards its DOM-only
// top-level code with `typeof document !== "undefined"` specifically so
// this works without a browser.
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(DIR, "data.js"), "utf8"), sandbox, { filename: "data.js" });
vm.runInContext(fs.readFileSync(path.join(DIR, "phosphor-icons.js"), "utf8"), sandbox, { filename: "phosphor-icons.js" });
vm.runInContext(fs.readFileSync(path.join(DIR, "app.js"), "utf8"), sandbox, { filename: "app.js" });

const HABIT_DECK_DATA = vm.runInContext("HABIT_DECK_DATA", sandbox);
const buildDeck = vm.runInContext("buildDeck", sandbox);
const drawDeckCard = vm.runInContext("drawDeckCard", sandbox);
const CARDS_PER_PAGE = vm.runInContext("CARDS_PER_PAGE", sandbox);
const slotXY = vm.runInContext("slotXY", sandbox);
const drawInstructionsPage = vm.runInContext("drawInstructionsPage", sandbox);
const drawCardBackPage = vm.runInContext("drawCardBackPage", sandbox);

// --- 1. Content-bank structure matches the locked architecture ------------
check(HABIT_DECK_DATA.framework.length === 4, `4 framework cards (got ${HABIT_DECK_DATA.framework.length})`);
check(HABIT_DECK_DATA.trackers.length === 8, `8 tracker cards (got ${HABIT_DECK_DATA.trackers.length})`);
check(HABIT_DECK_DATA.reflection.length === 6, `6 reflection cards (got ${HABIT_DECK_DATA.reflection.length})`);
check(HABIT_DECK_DATA.motivation.length === 2, `2 motivation cards (got ${HABIT_DECK_DATA.motivation.length})`);
check(HABIT_DECK_DATA.prompts.length === 24, `24 prompt cards (got ${HABIT_DECK_DATA.prompts.length})`);
check(HABIT_DECK_DATA.promptCategories.length === 4, `4 prompt categories (got ${HABIT_DECK_DATA.promptCategories.length})`);

HABIT_DECK_DATA.promptCategories.forEach((cat) => {
  const count = HABIT_DECK_DATA.prompts.filter((p) => p.category === cat.id).length;
  check(count === 6, `category "${cat.id}" has exactly 6 prompt cards (got ${count})`);
});

// every prompt's category must actually exist in promptCategories (catches typos)
const validCatIds = new Set(HABIT_DECK_DATA.promptCategories.map((c) => c.id));
const orphanPrompts = HABIT_DECK_DATA.prompts.filter((p) => !validCatIds.has(p.category));
check(orphanPrompts.length === 0, `no prompt cards reference an unknown category (found ${orphanPrompts.length})`);

// every id across all sections must be unique (catches copy-paste id collisions)
const allIds = [
  ...HABIT_DECK_DATA.framework.map((c) => c.id),
  ...HABIT_DECK_DATA.prompts.map((c) => c.id),
  ...HABIT_DECK_DATA.trackers.map((c) => c.id),
  ...HABIT_DECK_DATA.reflection.map((c) => c.id),
  ...HABIT_DECK_DATA.motivation.map((c) => c.id),
];
check(new Set(allIds).size === allIds.length, `all ${allIds.length} card ids are unique (no duplicates)`);

// no empty required fields anywhere in the bank
const emptyFields = [];
HABIT_DECK_DATA.framework.forEach((c) => { if (!c.title || !c.body) emptyFields.push(c.id); });
HABIT_DECK_DATA.prompts.forEach((c) => { if (!c.cue || !c.routine || !c.reward) emptyFields.push(c.id); });
HABIT_DECK_DATA.trackers.forEach((c) => { if (!c.title || !c.body) emptyFields.push(c.id); });
HABIT_DECK_DATA.reflection.forEach((c) => { if (!c.title || !c.body) emptyFields.push(c.id); });
HABIT_DECK_DATA.motivation.forEach((c) => { if (!c.body) emptyFields.push(c.id); });
check(emptyFields.length === 0, `no cards have empty required fields (found: ${emptyFields.join(", ") || "none"})`);

// --- 2. buildDeck() produces exactly 48 cards in the expected shape -------
// Set the sandbox's module-level buyerName/goals before calling buildDeck,
// same as the real form handler would.
vm.runInContext('buyerName = "Test Buyer"; goals = ["Read every night", "", "Walk daily"];', sandbox);
const deck = vm.runInContext("buildDeck()", sandbox);
check(deck.length === 48, `buildDeck() returns exactly 48 cards (got ${deck.length})`);
const typeCounts = deck.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {});
check(typeCounts.cover === 1, `exactly 1 cover card (got ${typeCounts.cover || 0})`);
check(typeCounts.framework === 4, `exactly 4 framework cards in the built deck (got ${typeCounts.framework || 0})`);
check(typeCounts.goal === 3, `exactly 3 goal cards in the built deck (got ${typeCounts.goal || 0})`);
check(typeCounts.prompt === 24, `exactly 24 prompt cards in the built deck (got ${typeCounts.prompt || 0})`);
check(typeCounts.tracker === 8, `exactly 8 tracker cards in the built deck (got ${typeCounts.tracker || 0})`);
check(typeCounts.reflection === 6, `exactly 6 reflection cards in the built deck (got ${typeCounts.reflection || 0})`);
check(typeCounts.motivation === 2, `exactly 2 motivation cards in the built deck (got ${typeCounts.motivation || 0})`);

// --- 3. Real PDF generation using the actual app.js drawing functions -----
// Helvetica stands in for Poppins (not loaded here) — wider per-char, so
// this is a conservative proxy per the same convention every other
// GoodStockPress harness uses; real text-fit is confirmed with Poppins in
// the browser pass, this just catches gross overflow/crash bugs early.
const STUB_ICON = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="; // 1x1 transparent PNG
const stubIconPngs = {};
HABIT_DECK_DATA.promptCategories.forEach((cat) => { stubIconPngs[cat.id] = `data:image/png;base64,${STUB_ICON}`; });

const pdfDoc = new jsPDF({ unit: "in", format: "letter" });
pdfDoc.setFont("helvetica", "normal");
// jsPDF doesn't have a "Poppins" font loaded in this harness — patch the
// doc's setFont so app.js's `doc.setFont("Poppins", ...)` calls silently
// fall back to helvetica instead of throwing.
const realSetFont = pdfDoc.setFont.bind(pdfDoc);
pdfDoc.setFont = (family, style) => realSetFont(family === "Poppins" ? "helvetica" : family, style === "bold" ? "bold" : "normal");

let drawError = null;
try {
  drawInstructionsPage(pdfDoc, "Test Buyer");
  pdfDoc.addPage();
  drawCardBackPage(pdfDoc);

  deck.forEach((entry, i) => {
    const posOnPage = i % CARDS_PER_PAGE;
    if (posOnPage === 0) pdfDoc.addPage();
    const [x, y] = slotXY(posOnPage);
    if (entry.type === "prompt") {
      // drawDeckCard reads icons off itself (drawDeckCard.iconPngs) — same
      // pattern the real downloadPdf() uses after preloadIcons() resolves.
      drawDeckCard.iconPngs = stubIconPngs;
    }
    drawDeckCard(pdfDoc, x, y, entry);
  });
} catch (e) {
  drawError = e;
}
check(drawError === null, `all 48 cards draw without throwing${drawError ? " — " + drawError.stack : ""}`);

const expectedCardPages = Math.ceil(deck.length / CARDS_PER_PAGE);
const expectedTotalPages = 1 /* instructions */ + 1 /* card back */ + expectedCardPages;
check(pdfDoc.internal.getNumberOfPages() === expectedTotalPages,
  `page count is ${pdfDoc.internal.getNumberOfPages()}, expected ${expectedTotalPages} (1 instructions + 1 back + ${expectedCardPages} card pages of 6 each for 48 cards)`);
check(deck.length % CARDS_PER_PAGE === 0, `48 cards fill the last page exactly (no leftover slots to design around)`);

const outPath = path.join(DIR, "test-output.pdf");
fs.writeFileSync(outPath, Buffer.from(pdfDoc.output("arraybuffer")));
console.log("Wrote " + outPath);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
