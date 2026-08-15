// Cricut-compatible cut files — one SVG per printed page, each card as its
// own rounded-rect vector path at the exact coordinates jsPDF prints it at
// (reuses this product's own CARD_W/CARD_H/slotXY/CARDS_PER_PAGE, so the
// cut lines are mathematically guaranteed to match the printed sheet).
//
// This is a "Cut Only" file, not "Print Then Cut" — Cricut's registration-
// mark mode requires Design Space itself to do the printing, which isn't
// our workflow (the buyer prints our PDF on their own printer). Instead the
// buyer loads their already-printed sheet onto the mat aligned to the
// sheet's own edges (normal mat loading), then cuts using the matching SVG.
//
// Note: buildDeck() always returns exactly 48 cards (1 cover + 4 framework +
// 3 fixed goal slots + fixed prompt/tracker/reflection/motivation sections —
// the goals form always has exactly 3 inputs, so this never varies), which
// divides evenly into CARDS_PER_PAGE=6 with no leftover. Still computed via
// Math.min per page (rather than hardcoded) for the same reason the other
// partial-capable products are: safe if the content bank ever changes size.

function buildCutFileSVG(cardCountOnPage) {
  let shapes = "";
  for (let pos = 0; pos < cardCountOnPage; pos++) {
    const [x, y] = slotXY(pos);
    shapes += `<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="0.08" ry="0.08" fill="none" stroke="#000000" stroke-width="0.01"/>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="8.5in" height="11in" viewBox="0 0 8.5 11">\n${shapes}</svg>\n`;
}

const CUT_FILE_README = `Habit-Builder Card Deck — Cricut Cut Files
==========================================

Each SVG here matches one page of your printed PDF — the number in the
filename is the PDF page number (e.g. cut-page-03.svg cuts PDF page 3).

How to use with a Cricut (Explore, Maker, or any machine that reads SVG
cut files):

1. Print your PDF at home as usual.
2. Place the printed sheet onto your Cricut cutting mat, aligned to the
   mat's paper-edge guides — the same way you'd load any full sheet.
3. In Design Space, upload the matching cut-page-XX.svg as a "Cut Only"
   project. You do not need Print Then Cut — your printer already
   printed the page, so there's nothing left for Cricut to print.
4. Cut. Each card comes out with clean, even rounded corners — no
   scissors, no paper trimmer, no corner-rounder punch needed.

These are Cut Only files, not Print Then Cut files — there are no
registration marks, since your printer (not the Cricut) did the
printing. Careful edge-to-edge alignment on the mat is what keeps the
cuts lined up with your printed cards.
`;

async function downloadCutFiles() {
  const zip = new JSZip();
  zip.file("README.txt", CUT_FILE_README);

  // PDF page numbering: page 1 = instructions (no card grid, not cut),
  // page 2 = card backs (6 identical tiles), page 3+ = fronts.
  zip.file("cut-page-02.svg", buildCutFileSVG(CARDS_PER_PAGE));

  const deck = buildDeck();
  const totalFrontPages = Math.ceil(deck.length / CARDS_PER_PAGE);
  for (let p = 0; p < totalFrontPages; p++) {
    const cardsOnThisPage = Math.min(CARDS_PER_PAGE, deck.length - p * CARDS_PER_PAGE);
    const pdfPageNum = p + 3;
    zip.file(`cut-page-${String(pdfPageNum).padStart(2, "0")}.svg`, buildCutFileSVG(cardsOnThisPage));
  }

  const filename = buyerName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename || "habit-builder"}-cricut-cut-files.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("cricut-download-btn").addEventListener("click", downloadCutFiles);
  });
}
