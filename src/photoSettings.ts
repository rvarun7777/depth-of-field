import { cameraEV, correctShutter } from "./lighting";

export type PhotoGoal = "portrait" | "together" | "scenery";
const ISOS = [100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600];
export const PHOTO_SHUTTERS = [4000, 3200, 2500, 2000, 1600, 1250, 1000, 800, 640, 500, 400, 320, 250, 200, 160, 125, 100, 80, 60, 50, 40, 30, 25, 20, 15, 13, 10, 8, 6, 5, 4, 3, 2.5, 2].map(d => 1 / d).concat([0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30]);

/** D5500 handheld/tripod starting points, not a scene-content-aware optimizer. */
export function recommendPhotoSettings(input: {
  ev: number; focal: number; widest: number; goal: PhotoGoal;
  tripod: boolean; moving: boolean; maxIso: number;
}) {
  const { ev, focal, widest, goal, moving } = input;
  const tripod = input.tripod && goal === "scenery";
  const maxIso = Math.min(25600, Math.max(100, input.maxIso));
  let aperture = Math.max(widest, goal === "portrait" ? widest : 8);
  const motionRate = goal === "scenery" ? 0 : moving ? 500 : 250;
  const slowest = tripod ? 30 : 1 / Math.max(focal * 1.52, motionRate);
  const allowed = PHOTO_SHUTTERS.filter(s => s <= slowest);
  const target = allowed[allowed.length - 1];
  const desiredIso = () => 100 * aperture * aperture / (target * 2 ** ev);
  // For two people in very dim light, trade some depth of field for lower ISO.
  if (goal === "together" && desiredIso() > maxIso) aperture = Math.max(widest, 5.6);
  const needed = desiredIso();
  const iso = ISOS.find(v => v >= needed && v <= maxIso) ?? (needed <= 100 ? 100 : maxIso);
  const desiredShutter = correctShutter(ev, aperture, iso);
  const shutter = allowed.reduce((best, s) => Math.abs(Math.log2(s / desiredShutter)) < Math.abs(Math.log2(best / desiredShutter)) ? s : best);
  // At the D5500's 1/4000 s limit, stop down instead of inventing a faster shutter.
  if (desiredShutter < 1 / 4000) {
    const neededAperture = Math.sqrt(shutter * 2 ** ev * iso / 100);
    aperture = [aperture, 4, 5.6, 8, 11, 16, 22].filter(a => a >= aperture).reduce((best, a) => Math.abs(Math.log2(a / neededAperture)) < Math.abs(Math.log2(best / neededAperture)) ? a : best);
  }
  const delta = ev - cameraEV(aperture, shutter, iso);
  const warnings: string[] = [];
  if (delta < -0.5) warnings.push(`Too dark within these limits (about ${Math.abs(delta).toFixed(1)} stops under). Add light, use a brighter lens, or raise the ISO ceiling. For a still scene, use a tripod.`);
  if (delta > 0.5) warnings.push(`Too bright within these limits (about ${delta.toFixed(1)} stops over). Reduce the light or add an ND filter.`);
  if (goal === "together" && aperture < 8) warnings.push("Opened the aperture to reduce ISO. Keep both faces at the same distance and check the focus zone.");
  if (iso >= 3200) warnings.push("Expect more noise at this ISO. Expose carefully and use Lightroom noise reduction; do not sacrifice the shutter needed to freeze your subject.");
  if (aperture >= 16) warnings.push("Stopped down for bright light; diffraction may soften detail. An ND filter can allow a wider aperture.");
  return { aperture, shutter, iso, delta, warnings, reason: `${goal === "portrait" ? "Wide aperture for subject separation" : goal === "together" ? "Depth of field for two faces" : "Depth of field for scenery"}; ${tripod ? "longer exposure on a tripod" : "shutter bounded for handheld shake" + (motionRate ? " and subject movement" : "")}; lowest practical ISO within those priorities.` };
}
