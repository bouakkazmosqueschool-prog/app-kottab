import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_THEMES, normalizeTheme } from '../src/data/themes.ts';
import { appearanceTokens, restoreSettings } from '../src/lib/appearance.ts';

const defaults = { schoolName: 'School', defaultPeriodType: 'month' as const, darkMode: false, theme: 'classic' as const };

test('existing preferences restore with the original theme and keep night mode', () => {
  const restored = restoreSettings({ schoolName: 'Existing school', defaultPeriodType: 'week', darkMode: true }, defaults);
  assert.deepEqual(restored, { schoolName: 'Existing school', defaultPeriodType: 'week', darkMode: true, theme: 'classic' });
  assert.equal(restoreSettings(null, defaults).theme, 'classic');
  assert.equal(restoreSettings({ theme: '__proto__' }, defaults).theme, 'classic');
  assert.equal(normalizeTheme('missing'), 'classic');
});

test('all saved palettes survive restore independently of day/night selection', () => {
  for (const theme of Object.keys(APP_THEMES)) {
    for (const darkMode of [false, true]) {
      const saved = JSON.parse(JSON.stringify({ ...defaults, theme, darkMode }));
      const restored = restoreSettings(saved, defaults);
      assert.equal(restored.theme, theme);
      assert.equal(restored.darkMode, darkMode);
      const tokens = appearanceTokens(restored.theme, restored.darkMode);
      assert.equal(Object.keys(tokens).length, 16);
      assert.ok(Object.values(tokens).every((color) => /^#[0-9a-f]{6}$/i.test(color)));
    }
  }
});

function luminance(hex: string): number {
  const rgb = hex.slice(1).match(/../g)!.map((v) => parseInt(v, 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test('text, primary buttons and navigation keep readable contrast in all eight appearances', () => {
  for (const [name, theme] of Object.entries(APP_THEMES)) {
    for (const mode of ['light', 'dark'] as const) {
      const p = theme[mode];
      for (const [label, fg, bg] of [
        ['body', p.text, p.background], ['cards', p.text, p.surface],
        ['secondary text', p.muted, p.surface], ['primary buttons', p.background, p.primary],
        ['sidebar', p.sidebarText, p.sidebar], ['selected navigation', p.sidebarActiveText, p.sidebarActive],
      ]) {
        const ratio = contrast(fg, bg);
        assert.ok(ratio >= 4.5, `${name}/${mode}/${label}: ${ratio.toFixed(2)} < 4.5`);
      }
    }
  }
});
