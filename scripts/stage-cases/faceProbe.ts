// The v3 costume sheet's layout and its check (rewards spec §5.1, §7): every costume drawn; no held prop over his eyes or mouth
// in any paw pose; no opaque headgear over his eyes (an eye patch). A string, so the bundler's helpers never reach the page.
export const SHEET_COLUMNS = 6;
export const SHEET_CELL_HEIGHT = 560;
/** Sample points across each face part's box, per side: a thin held pole (heldPole w = 8, ~5 px at 220 px) can't slip between. */
export const SHEET_GRID = 10;
/** The share of an eye that opaque head art may cover before it counts as covering it (a brim's edge, not a patch). */
export const SHEET_EYE_COVER = 0.15;
export const SHEET_PROBE = `(() => {
  const N = ${SHEET_GRID};
  const out = [];
  const opaque = (el) => {
    for (let e = el; e && e.tagName !== 'svg'; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (Number(cs.opacity) < 0.5) return false;
      if (e === el && el.getAttribute('fill') !== 'none' && Number(cs.fillOpacity) < 0.5) return false;
    }
    return true;
  };
  for (const cell of document.querySelectorAll('[data-costume]')) {
    const id = cell.getAttribute('data-costume');
    for (const fig of cell.querySelectorAll('figure')) {
      const row = fig.getAttribute('data-row');
      const svg = fig.querySelector('svg.truffle');
      if (!svg || svg.getAttribute('data-outfit') !== id) { out.push(id + ' ' + row + ': not drawn'); continue; }
      if (row === 'tile') continue;
      const parts = {};
      for (const part of ['eye-white-l', 'eye-white-r', 'mouth']) {
        const el = svg.querySelector('[data-part="' + part + '"]');
        if (!el) out.push(id + ' ' + row + ': no ' + part); else parts[part] = el.getBoundingClientRect();
      }
      // 1. a held prop (pawL / pawR art) over his eyes (inside each eye's ellipse) or his mouth (its whole box). Where his own
      //    bare paw is under it, it is his paw (a glove, a paw closing round a handle), not a prop crossing his face. When he
      //    hides (the cover move: both paws over his eyes, then a peek) his eyes are meant to be covered: only his mouth counts
      const hits = [];
      const hiding = row.startsWith('cover@');
      for (const [part, r] of Object.entries(parts)) for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
        const eye = part !== 'mouth';
        if (eye && hiding) continue;
        const u = (2 * i) / N - 1, v = (2 * j) / N - 1;
        if (eye && u * u + v * v > 0.81) continue;
        const x = r.left + (r.width * i) / N, y = r.top + (r.height * j) / N;
        const el = document.elementFromPoint(x, y);
        const prop = el && el.closest('.truffle__outfit-paw');
        if (prop && svg.contains(prop)) hits.push([x, y]);
      }
      if (hits.length) {
        const over = svg.querySelectorAll('.truffle__outfit-paw, .truffle__accessory--over');
        for (const g of over) g.style.visibility = 'hidden';
        const bare = hits.filter(([x, y]) => { const el = document.elementFromPoint(x, y); return !(el && svg.contains(el) && el.closest('.truffle__paw')); });
        for (const g of over) g.style.visibility = '';
        if (bare.length) out.push(id + ' ' + row + ': a held prop crosses his face');
      }
      // 2. opaque headgear over an eye (an eye patch; a see-through visor is fine): the points inside each eye's ellipse
      for (const part of ['eye-white-l', 'eye-white-r']) {
        const r = parts[part];
        if (!r) continue;
        let inside = 0, covered = 0;
        for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
          const u = (2 * i) / N - 1, v = (2 * j) / N - 1;
          if (u * u + v * v > 0.81) continue;
          inside++;
          const el = document.elementFromPoint(r.left + (r.width * i) / N, r.top + (r.height * j) / N);
          const head = el && el.closest('.truffle__outfit-head');
          if (head && svg.contains(head) && opaque(el)) covered++;
        }
        if (inside && covered / inside > ${SHEET_EYE_COVER}) out.push(id + ' ' + row + ': headgear covers his ' + (part.endsWith('l') ? 'left' : 'right') + ' eye (' + Math.round((100 * covered) / inside) + '%)');
      }
    }
  }
  return out;
})()`;
