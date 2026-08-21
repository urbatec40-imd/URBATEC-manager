import type { Position } from 'geojson';

export type CadastralPoint = {
  index: number;
  position: Position;
  x?: number;
  y?: number;
  turnDeg: number;
};

type XY = { x: number; y: number };

const toLocal = (p: Position, originLat: number): XY => {
  const lon = Number(p[0]);
  const lat = Number(p[1]);
  const kx = 111320 * Math.max(0.2, Math.cos(originLat * Math.PI / 180));
  return { x: lon * kx, y: lat * 111320 };
};

const angleBetween = (a: XY, b: XY, c: XY): number => {
  const ux = a.x - b.x;
  const uy = a.y - b.y;
  const vx = c.x - b.x;
  const vy = c.y - b.y;
  const nu = Math.hypot(ux, uy);
  const nv = Math.hypot(vx, vy);
  if (!nu || !nv) return 0;
  const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (nu * nv)));
  const interior = Math.acos(cos) * 180 / Math.PI;
  return Math.abs(180 - interior);
};

/**
 * Returns only clear direction changes of a cadastral boundary.
 * Small digitizing noise and vertices lying on the same straight edge are ignored.
 */
export function extractCharacteristicPoints(
  ring: Position[],
  options: { minTurnDeg?: number; minEdgeLengthM?: number } = {},
): CadastralPoint[] {
  const minTurnDeg = options.minTurnDeg ?? 25;
  const minEdgeLengthM = options.minEdgeLengthM ?? 1.5;
  if (ring.length < 4) return [];

  const closed = ring.length > 1 &&
    Number(ring[0][0]) === Number(ring[ring.length - 1][0]) &&
    Number(ring[0][1]) === Number(ring[ring.length - 1][1]);
  const points = closed ? ring.slice(0, -1) : ring.slice();
  if (points.length < 3) return [];

  const originLat = points.reduce((s, p) => s + Number(p[1]), 0) / points.length;
  const xy = points.map(p => toLocal(p, originLat));
  const result: CadastralPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const prev = xy[(i - 1 + points.length) % points.length];
    const cur = xy[i];
    const next = xy[(i + 1) % points.length];
    const incoming = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const outgoing = Math.hypot(next.x - cur.x, next.y - cur.y);
    if (incoming < minEdgeLengthM || outgoing < minEdgeLengthM) continue;

    const turnDeg = angleBetween(prev, cur, next);
    if (turnDeg >= minTurnDeg) {
      result.push({ index: i, position: points[i], turnDeg });
    }
  }

  return result;
}

export function polygonRing(featureGeometry: { type: string; coordinates?: any }): Position[] {
  if (featureGeometry.type === 'Polygon') return featureGeometry.coordinates?.[0] ?? [];
  if (featureGeometry.type === 'LineString') return featureGeometry.coordinates ?? [];
  return [];
}
