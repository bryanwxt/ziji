// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_FINDS } from '../../fun/finds';
import { WORLDS } from '../../fun/worlds';
import { DEFAULT_KID } from '../../types';
import { FX_MS, momentFx } from './momentFx';
import { MOMENTS, runMoment } from './moments';
import { sceneFor } from './scenes';

const kid = { ...DEFAULT_KID, finds: { ...DEFAULT_FINDS } };

describe('what each prop moment draws (spec 2026-10-04 §4.5)', () => {
  for (const w of WORLDS) for (const m of MOMENTS[w.id]) {
    const fx = runMoment(w.id, m.prop, kid, '2026-10-06', 1).fx;
    it(`${w.id}:${m.prop} draws its moment, hiding only a prop the scene has`, () => {
      const { svg, hide } = momentFx(w.id, fx, false);
      if (fx.kind !== 'roll') expect(svg.length).toBeGreaterThan(0);
      expect(svg).not.toMatch(/<filter|filter=/);
      if (hide) expect(sceneFor(w.id, 'afternoon')).toContain(hide.match(/data-prop="([^"]+)"/)![0]);
      expect(FX_MS[fx.kind]).toBeGreaterThan(0);
    });
    it(`${w.id}:${m.prop} with reduced motion: nothing moves`, () => {
      expect(momentFx(w.id, fx, true).svg).not.toMatch(/animateTransform|animateMotion/);
    });
  }
});
