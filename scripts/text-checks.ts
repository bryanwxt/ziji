/* Typography a phone gets wrong (parent 2026-10-15, iPhone Safari): a pinyin string drifting over spaced characters, a 。 or
   a measure word alone at the start of a line, a speak button on its text, a glyph cut off by a clipping box.
   textChecks runs in the page (plain JS, no imports or outer names): fit-check's probe and the stage cases both call it. */

export function textChecks(): string[] {
  const out = new Set<string>();
  const CLOSING = /^[。，、；：！？…—～·」』）》〉】〕”’)\]}!?,.;:%]/u;
  const HAN = /\p{Script=Han}/u;
  const hidden = (el: Element) => !!el.closest('.sr-only, [hidden], .world-props, .rotate-hint, .is-eaten') || getComputedStyle(el).visibility === 'hidden' || getComputedStyle(el).display === 'none';
  const rectOf = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };
  const short = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);

  // 1. each syllable centred over its character (a Label cell)
  for (const cell of document.querySelectorAll('.label__cell--zh')) {
    if (hidden(cell)) continue;
    const py = cell.querySelector('.label__py'), ch = cell.querySelector('.label__ch');
    if (!py || !ch || !(py.textContent ?? '').trim()) continue;
    const a = rectOf(py), b = rectOf(ch);
    if (!a || !b) continue;
    const dx = Math.abs(a.left + a.width / 2 - (b.left + b.width / 2));
    if (dx > Math.max(2, b.width * 0.08)) out.add(`pinyin off its character: ${py.textContent} over ${ch.textContent} by ${Math.round(dx)}px`);
    if (a.bottom > b.top + b.height * 0.25) out.add(`pinyin not above its character: ${py.textContent} over ${ch.textContent}`);
  }
  // ...and never one pinyin string over several characters: it drifts off wide-spaced characters (yǔ yī over 雨衣)
  for (const py of document.querySelectorAll('.pinyin, .zika__py, .wotd__py')) {
    if (hidden(py) || !rectOf(py)) continue;
    const syl = (py.textContent ?? '').trim().split(/\s+/).filter(Boolean);
    const next = py.nextElementSibling;
    const below = next ? Array.from((next.textContent ?? '')).filter((c) => HAN.test(c)) : [];
    if (syl.length > 1 && below.length > 1 && next && !next.querySelector('.label')) out.add(`one pinyin string over ${below.length} characters: ${syl.join(' ')} over ${below.join('')}`);
  }

  // 2. no line starts with closing punctuation, and no measure word is cut off its number
  const breaks: string[] = [];
  for (const cells of document.querySelectorAll('.label__cells')) {
    if (hidden(cells)) continue;
    const list = [...cells.querySelectorAll('.label__cell')].map((c) => ({ ch: c.querySelector('.label__ch')?.textContent ?? '', r: rectOf(c.querySelector('.label__ch') ?? c) }));
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]!, cur = list[i]!;
      if (!prev.r || !cur.r || cur.r.top < prev.r.bottom - 2) continue; // same line
      const text = list.map((c) => c.ch).join('');
      if (CLOSING.test(cur.ch.trimStart())) breaks.push(`a line starts with ${cur.ch.trim()}: ${short(text)}`);
      else if (/\d$/.test(prev.ch.trim()) && HAN.test(cur.ch)) breaks.push(`measure word cut off its number: ${prev.ch.trim()} | ${cur.ch}: ${short(text)}`);
    }
  }
  // plain text: the browser keeps 。 off a line's start, but an inline block (a hanging 。) is a break it can take
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const lineRects: { r: DOMRect; text: string; el: Element }[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    const t = n.textContent ?? '';
    if (!el || !t.trim() || hidden(el) || el.closest('.label__cells, svg')) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    // a line's box is the font's whole ascent and descent: keep the middle em, where the ink is, so a big character's empty
    // line space under it isn't "text" a button below sits on
    const em = parseFloat(getComputedStyle(el).fontSize);
    for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) { const mid = r.top + r.height / 2; lineRects.push({ r: new DOMRect(r.left, mid - em * 0.45, r.width, em * 0.9), text: t, el }); }
    if (CLOSING.test(t) && el.previousSibling) {
      // the first character of this node against the last of the text before it
      const first = document.createRange(); first.setStart(n, 0); first.setEnd(n, 1);
      const a = first.getBoundingClientRect();
      const prevText = (() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); w.currentNode = n; for (let p = w.previousNode(); p; p = w.previousNode()) if ((p.textContent ?? '').trim()) return p; return null; })();
      const block = (e: Element | null) => { while (e && getComputedStyle(e).display.startsWith('inline')) e = e.parentElement; return e; };
      if (prevText && a.width && block(prevText.parentElement) === block(el)) {
        const len = (prevText.textContent ?? '').length;
        const last = document.createRange(); last.setStart(prevText, len - 1); last.setEnd(prevText, len);
        const b = last.getBoundingClientRect();
        if (b.width && a.top >= b.bottom - 2 && Math.abs(a.left - b.right) > 4) breaks.push(`a line starts with ${t.trim()[0]}: ${short(prevText.textContent)}${t.trim()}`);
      }
    }
  }
  for (const b of breaks) out.add(b);

  // 3. a speak button never sits on text
  const speaks = [...document.querySelectorAll('.speak')].filter((s) => !hidden(s) && rectOf(s));
  // a character's own box; a line-end ！ or 。 by its half slot, where its ink is (its box runs on into the empty right half)
  const glyphs = [...document.querySelectorAll('.label__ch')].filter((g) => !hidden(g) && (g.textContent ?? '').trim()).map((g) => ({ r: rectOf(g.closest('.label__cell--zh') || !g.parentElement ? g : g.parentElement), text: g.textContent ?? '', el: g as Element }));
  // a button in a modal over a page only meets that modal's text: what's under the backdrop isn't "under the button"
  const layer = (e: Element | null) => { for (; e; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return e; return null; };
  for (const s of speaks) {
    const a = s.getBoundingClientRect();
    const sl = layer(s);
    for (const g of [...glyphs, ...lineRects]) {
      if (!g.r || s.contains(g.el)) continue;
      if (g.el && layer(g.el) !== sl) continue;
      const w = Math.min(a.right, g.r.right) - Math.max(a.left, g.r.left), h = Math.min(a.bottom, g.r.bottom) - Math.max(a.top, g.r.top);
      if (w > 3 && h > 3) { out.add(`speak button on text: ${short(g.text)}`); break; }
    }
  }

  // 4. a small label's glyphs inside any box that clips them: a calligraphic 补 inks past its advance box (half of it was cut)
  for (const tag of document.querySelectorAll('.intro__tag, .label-tag')) {
    if (hidden(tag)) continue;
    const range = document.createRange();
    range.selectNodeContents(tag);
    const t = range.getBoundingClientRect();
    if (!t.width) continue;
    const em = parseFloat(getComputedStyle(tag).fontSize);
    for (let p = tag.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible' && cs.clipPath === 'none') continue;
      const c = p.getBoundingClientRect();
      const left = c.left + p.clientLeft, top = c.top + p.clientTop, right = left + p.clientWidth, bottom = top + p.clientHeight;
      const room = Math.min(t.left - left, t.top - top, right - t.right, bottom - t.bottom);
      if (room < em * 0.15) out.add(`tag clipped: ${short(tag.textContent)} sits ${room.toFixed(1)}px from the edge of <${p.tagName.toLowerCase()} class="${p.getAttribute('class') ?? ''}"> (needs ${(em * 0.15).toFixed(1)}px for its ink)`);
    }
  }
  return [...out];
}
