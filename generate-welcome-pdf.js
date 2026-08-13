// Generates the "Welcome to GoodStockPress" PDF Etsy auto-delivers at
// purchase for Habit-Builder Card Deck — native jsPDF, fixed inch coordinates.
// Uses the Etsy-order-number claim flow (see AUTH_API_BASE in app.js).
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const INK = [28, 20, 18];
const ACCENT = [45, 110, 126]; // teal, matches the deck's own default ACCENT in app.js
const TAGLINE_GOLD = [199, 163, 88];
const DIVIDER = [214, 199, 184];
const CARD_BG = [244, 246, 248];

const DOMAIN = "habit-builder-card-deck.vercel.app";

function loadPoppins(doc) {
  const fonts = fs.readFileSync(path.join(__dirname, "fonts.js"), "utf8");
  const vm = require("vm");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fonts, sandbox, { filename: "fonts.js" });
  const regular = vm.runInContext("POPPINS_REGULAR_BASE64", sandbox);
  const semibold = vm.runInContext("POPPINS_SEMIBOLD_BASE64", sandbox);
  doc.addFileToVFS("Poppins-Regular.ttf", regular);
  doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
  doc.addFileToVFS("Poppins-SemiBold.ttf", semibold);
  doc.addFont("Poppins-SemiBold.ttf", "Poppins", "bold");
}

function centeredSpacedText(doc, text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map((ch) => doc.getTextWidth(ch));
  const totalWidth = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - totalWidth / 2;
  chars.forEach((ch, i) => { doc.text(ch, x, y); x += widths[i] + spacing; });
}

const doc = new jsPDF({ unit: "in", format: "letter" });
loadPoppins(doc);

const pageW = 8.5, marginX = 1;
let y = 0.85;

// Masthead
const logo = fs.readFileSync(path.join(__dirname, "logo.png")).toString("base64");
doc.addImage(`data:image/png;base64,${logo}`, "PNG", marginX, y, 0.55, 0.55);
doc.setFont("Poppins", "bold");
doc.setFontSize(20);
doc.setTextColor(...INK);
doc.text("GoodStockPress", marginX + 0.7, y + 0.28);
doc.setFont("Poppins", "normal");
doc.setFontSize(10.5);
doc.setTextColor(...TAGLINE_GOLD);
doc.text("Good stock, good words, good gifts.", marginX + 0.7, y + 0.5);

y += 1.0;
doc.setDrawColor(...DIVIDER);
doc.setLineWidth(0.01);
doc.line(marginX, y, pageW - marginX, y);
y += 0.45;

// Eyebrow + headline
doc.setFont("Poppins", "bold");
doc.setFontSize(11);
doc.setTextColor(...ACCENT);
centeredSpacedText(doc, "ORDER CONFIRMED", marginX, y, 0.025);
y += 0.35;

doc.setFont("Poppins", "bold");
doc.setFontSize(27);
doc.setTextColor(...INK);
doc.text("Thanks for your order!", marginX, y);
y += 0.4;

// Lede
doc.setFont("Poppins", "normal");
doc.setFontSize(12.5);
doc.setTextColor(...INK);
const lede = "Your deck isn't in this file — it's built just for you, in about 2 minutes, right here:";
const ledeLines = doc.splitTextToSize(lede, pageW - marginX * 2);
doc.text(ledeLines, marginX, y, { lineHeightFactor: 1.4 });
y += ledeLines.length * 0.22 + 0.45;

// Steps
const steps = [
  ["Go to the link below", "Works on your phone, tablet, or computer."],
  ["Enter your Etsy order number", "Find it in your Etsy purchase confirmation email, or under Purchases & Reviews on Etsy — it looks like #1234567890."],
  ["Add your name & up to 3 goals", "Totally optional — the deck works just as well blank."],
  ["Download the deck", "48 cards, built instantly as a print-ready PDF."],
];

steps.forEach(([title, body], i) => {
  const circleR = 0.16;
  const cy = y - 0.06;
  doc.setFillColor(...ACCENT);
  doc.circle(marginX + circleR, cy, circleR, "F");
  doc.setFont("Poppins", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(String(i + 1), marginX + circleR, cy + 0.045, { align: "center" });

  doc.setFont("Poppins", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(title, pageW - marginX * 2 - 0.42);
  doc.text(titleLines, marginX + 0.42, y, { lineHeightFactor: 1.25 });

  doc.setFont("Poppins", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(90, 83, 76);
  const bodyY = y + titleLines.length * 0.2 + 0.06;
  const bodyLines = doc.splitTextToSize(body, pageW - marginX * 2 - 0.42);
  doc.text(bodyLines, marginX + 0.42, bodyY, { lineHeightFactor: 1.35 });

  y = bodyY + bodyLines.length * 0.19 + 0.3;
});

y += 0.05;

// Code box
const boxW = pageW - marginX * 2;
const boxH = 1.15;
const cx = marginX + boxW / 2;
doc.setFillColor(...CARD_BG);
doc.roundedRect(marginX, y, boxW, boxH, 0.08, 0.08, "F");
doc.setDrawColor(...ACCENT);
doc.setLineWidth(0.015);
doc.roundedRect(marginX, y, boxW, boxH, 0.08, 0.08, "S");

doc.setFont("Poppins", "bold");
doc.setFontSize(10);
doc.setTextColor(...ACCENT);
doc.text("GO TO", cx, y + 0.35, { align: "center" });
doc.setFont("Poppins", "bold");
doc.setFontSize(16);
doc.setTextColor(...INK);
doc.text(DOMAIN, cx, y + 0.62, { align: "center" });

doc.setFont("Poppins", "bold");
doc.setFontSize(10);
doc.setTextColor(...ACCENT);
doc.text("YOUR CODE", cx, y + 0.9, { align: "center" });
doc.setFont("Poppins", "normal");
doc.setFontSize(11.5);
doc.setTextColor(...INK);
doc.text("Your Etsy order number — see step 2 above", cx, y + 1.08, { align: "center" });

y += boxH + 0.4;

doc.setFont("Poppins", "normal");
doc.setFontSize(10);
doc.setTextColor(90, 83, 76);
doc.text("Keep this page — the link stays active, so you can rebuild the deck anytime.", marginX, y);
y += 0.24;
doc.text("Questions or something not working? Just message the shop and we'll sort it out.", marginX, y);

// Footer
const footerY = 10.4;
doc.setDrawColor(...DIVIDER);
doc.setLineWidth(0.01);
doc.line(marginX, footerY - 0.25, pageW - marginX, footerY - 0.25);
doc.setFont("Poppins", "bold");
doc.setFontSize(10);
doc.setTextColor(...INK);
doc.text("GoodStockPress", marginX, footerY);
doc.setFont("Poppins", "normal");
doc.setTextColor(...TAGLINE_GOLD);
doc.text(DOMAIN, pageW - marginX, footerY, { align: "right" });

const outPath = path.join(__dirname, "..", "goodstockpress", "assets", "habit-builder-card-deck-welcome.pdf");
fs.writeFileSync(outPath, Buffer.from(doc.output("arraybuffer")));
console.log("Wrote", outPath, "pages:", doc.internal.getNumberOfPages());
