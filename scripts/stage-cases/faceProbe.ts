// The v3 costume sheet's layout and its check (rewards spec §5.1, §7): every costume drawn, and no held prop over his eyes or
// mouth, idle or cheering. A string, so the bundler's helpers never reach the page.
export const SHEET_COLUMNS = 6;
export const SHEET_CELL_HEIGHT = 560;
export const SHEET_PROBE = `(() => {
  const out = [];
  for (const cell of document.querySelectorAll('[data-costume]')) {
    const id = cell.getAttribute('data-costume');
    for (const fig of cell.querySelectorAll('figure')) {
      const row = fig.getAttribute('data-row');
      const svg = fig.querySelector('svg.truffle');
      if (!svg || svg.getAttribute('data-outfit') !== id) { out.push(id + ' ' + row + ': not drawn'); continue; }
      if (row === 'tile') continue;
      let crossed = false;
      for (const part of ['eye-white-l', 'eye-white-r', 'mouth']) {
        const r = svg.querySelector('[data-part="' + part + '"]').getBoundingClientRect();
        for (let i = 1; i < 5; i++) for (let j = 1; j < 5; j++) {
          const el = document.elementFromPoint(r.left + (r.width * i) / 5, r.top + (r.height * j) / 5);
          const prop = el && el.closest('.truffle__outfit-paw');
          if (prop && svg.contains(prop)) crossed = true;
        }
      }
      if (crossed) out.push(id + ' ' + row + ': a held prop crosses his face');
    }
  }
  return out;
})()`;
