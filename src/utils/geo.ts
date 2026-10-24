import type { LatLng } from '../types';

const R = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function pathLengthKm(path: LatLng[]): number {
  let d = 0;
  for (let i = 1; i < path.length; i++) d += haversineKm(path[i - 1], path[i]);
  return d;
}

/** Point at fraction t (0..1) along a polyline. */
export function pointAlong(path: LatLng[], t: number): LatLng {
  if (path.length === 0) return [0, 0];
  if (t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  const total = pathLengthKm(path);
  let target = total * t;
  for (let i = 1; i < path.length; i++) {
    const seg = haversineKm(path[i - 1], path[i]);
    if (target <= seg) {
      const f = seg === 0 ? 0 : target / seg;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f];
    }
    target -= seg;
  }
  return path[path.length - 1];
}

/** Approximate distance (km) from point p to segment ab using an equirectangular projection. */
export function pointToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const k = Math.cos(toRad(p[0]));
  const ax = a[1] * k, ay = a[0], bx = b[1] * k, by = b[0], px = p[1] * k, py = p[0];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  const deg = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  return deg * 111.32;
}

export function pointToPathKm(p: LatLng, path: LatLng[]): number {
  let min = Infinity;
  for (let i = 1; i < path.length; i++) min = Math.min(min, pointToSegmentKm(p, path[i - 1], path[i]));
  return path.length === 1 ? haversineKm(p, path[0]) : min;
}

/** Road-distance estimate from straight line, using a fixed demo detour factor. */
export const ROAD_FACTOR = 1.35;
export const URBAN_SPEED_KMH = 30;

export function straightLineEstimate(a: LatLng, b: LatLng) {
  const straightKm = haversineKm(a, b);
  const roadKm = straightKm * ROAD_FACTOR;
  return { straightKm, roadKm, minutes: (roadKm / URBAN_SPEED_KMH) * 60 };
}
