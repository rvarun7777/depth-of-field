import test from "node:test";
import assert from "node:assert/strict";
import { recommendPhotoSettings } from "./photoSettings";
import { formatShutter, SCENES } from "./lighting";

const base = { ev: 14, focal: 55, widest: 5.6, goal: "portrait" as const, tripod: false, moving: false, maxIso: 6400 };

test("recommendations respect D5500 and lens limits across scenes and light offsets", () => {
  for (const scene of SCENES) for (const offset of [-4, 0, 4]) {
    for (const [focal, widest] of [[18, 3.5], [55, 5.6], [200, 5.6]]) {
      for (const goal of ["portrait", "together", "scenery"] as const) {
        const r = recommendPhotoSettings({ ...base, ev: scene.ev + offset, focal, widest, goal });
        assert.ok(r.aperture >= widest && r.aperture <= 22);
        assert.ok(r.iso >= 100 && r.iso <= 6400);
        assert.ok(r.shutter >= 1 / 4000 && r.shutter <= 1 / (focal * 1.52));
        if (goal !== "scenery") assert.ok(r.shutter <= 1 / 250);
        if (Math.abs(r.delta) > 0.5) assert.ok(r.warnings.some(w => w.startsWith("Too ")));
      }
    }
  }
});

test("dim portraits retain motion protection and report insufficient light", () => {
  const r = recommendPhotoSettings({ ...base, ev: 1, moving: true });
  assert.ok(r.shutter <= 1 / 500);
  assert.equal(r.iso, 6400);
  assert.ok(r.delta < -0.5);
  assert.ok(r.warnings.some(w => w.startsWith("Too dark")));
});

test("tripod scenery allows low ISO and a long exposure without relaxing portrait shutter", () => {
  const r = recommendPhotoSettings({ ...base, ev: 4, goal: "scenery", tripod: true });
  assert.equal(r.iso, 100);
  assert.equal(r.aperture, 8);
  assert.equal(r.shutter, 4);
  assert.ok(Math.abs(r.delta) < 0.01);
  const portrait = recommendPhotoSettings({ ...base, ev: 4, tripod: true });
  assert.ok(portrait.shutter <= 1 / 250);
});

test("brighter scenes lower ISO and moving people request faster shutters", () => {
  const bright = recommendPhotoSettings(base);
  const dark = recommendPhotoSettings({ ...base, ev: 8 });
  assert.ok(dark.iso > bright.iso);
  assert.ok(Math.abs(dark.delta) < 0.35);
  assert.ok(recommendPhotoSettings({ ...base, ev: 8, moving: true }).shutter <= 1 / 500);
  assert.equal(formatShutter(1 / 125), "1/125");
  assert.equal(formatShutter(1 / 250), "1/250");
});
