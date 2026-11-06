// Print exactly one printable block: blocks carry .print-area plus a mode
// class (.print-label-block / .print-invoice-block); adding
// printing-<mode> to <body> makes the @media print rules in index.css
// show only the matching block. Mirrors the original label behaviour:
// afterprint cleanup plus a 1s fallback for browsers that skip it.
export function printBlock(mode) {
  const cls = `printing-${mode}`;
  document.body.classList.add(cls);
  const done = () => { document.body.classList.remove(cls); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  window.print();
  setTimeout(done, 1000);
}
