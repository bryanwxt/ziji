// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deviceLabel, isInstalled } from './device';

const IPAD_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

describe('which device, and is it the Home Screen app (review 2026-10-17)', () => {
  it('names the device shortly: iPad (even asking for the desktop site), iPhone, Mac, Android', () => {
    expect(deviceLabel({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', maxTouchPoints: 5 })).toBe('iPad');
    expect(deviceLabel({ userAgent: IPAD_DESKTOP_UA, maxTouchPoints: 5 })).toBe('iPad');
    expect(deviceLabel({ userAgent: IPAD_DESKTOP_UA, maxTouchPoints: 0 })).toBe('Mac');
    expect(deviceLabel({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', maxTouchPoints: 5 })).toBe('iPhone');
    expect(deviceLabel({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', maxTouchPoints: 5 })).toBe('Android');
    expect(deviceLabel(undefined)).toBeNull();
  });
  it("is installed when it runs standalone (the Home Screen app), not in Safari's tab", () => {
    expect(isInstalled({ matchMedia: () => ({ matches: true }), navigator: {} })).toBe(true);
    expect(isInstalled({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } })).toBe(true);
    expect(isInstalled({ matchMedia: () => ({ matches: false }), navigator: {} })).toBe(false);
    expect(isInstalled({})).toBe(false);
  });
});
