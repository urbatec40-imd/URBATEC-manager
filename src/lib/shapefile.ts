export interface ShapeRecord {
  points: [number, number][][];
  bbox: [number, number, number, number];
  attributes: Record<string, string>;
  areaM2: number;
}

export interface ShapefileLayer {
  shapeType: number;
  records: ShapeRecord[];
  fields: string[];
  prj: string;
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function decodeDbf(bytes: Uint8Array): { fields: string[]; rows: Record<string, string>[] } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 32) throw new Error("DBF invalide ou incomplet");
  const recordCount = view.getUint32(4, true);
  const headerLength = view.getUint16(8, true);
  const recordLength = view.getUint16(10, true);
  const decoder = new TextDecoder("windows-1252");
  const fields: { name: string; length: number; offset: number }[] = [];
  let offset = 32;
  let fieldOffset = 1;
  while (offset + 32 <= headerLength && bytes[offset] !== 0x0d) {
    const rawName = decoder.decode(bytes.slice(offset, offset + 11));
    const name = rawName.replace(/\0/g, "").trim();
    if (name) {
      fields.push({ name, length: bytes[offset + 16], offset: fieldOffset });
      fieldOffset += bytes[offset + 16];
    }
    offset += 32;
  }
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < recordCount; i += 1) {
    const base = headerLength + i * recordLength;
    if (base + recordLength > bytes.length || bytes[base] === 0x2a) continue;
    const row: Record<string, string> = {};
    for (const field of fields) {
      const start = base + field.offset;
      const end = Math.min(start + field.length, bytes.length);
      row[field.name] = decoder.decode(bytes.slice(start, end)).trim();
    }
    rows.push(row);
  }
  return { fields: fields.map((f) => f.name), rows };
}

function ringArea(points: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function polygonArea(parts: [number, number][][]): number {
  // ESRI polygon rings use winding direction to distinguish shells/holes.
  // Preserve that convention while returning an absolute projected area.
  const total = parts.reduce((sum, ring) => sum + ringArea(ring), 0);
  return Math.abs(total);
}

function parseShp(bytes: Uint8Array): { shapeType: number; geometries: { points: [number, number][][]; bbox: [number, number, number, number] }[] } {
  if (bytes.length < 100) throw new Error("SHP invalide ou incomplet");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const shapeType = view.getInt32(32, true);
  const geometries: { points: [number, number][][]; bbox: [number, number, number, number] }[] = [];
  let cursor = 100;
  while (cursor + 8 <= bytes.length) {
    const contentWords = view.getInt32(cursor + 4, false);
    const contentBytes = contentWords * 2;
    const contentStart = cursor + 8;
    if (contentBytes < 4 || contentStart + contentBytes > bytes.length) break;
    const recordType = view.getInt32(contentStart, true);
    if (recordType === 0) {
      cursor = contentStart + contentBytes;
      continue;
    }
    if (![3, 5, 13, 15, 23, 25].includes(recordType)) {
      cursor = contentStart + contentBytes;
      continue;
    }
    const box = [
      view.getFloat64(contentStart + 4, true),
      view.getFloat64(contentStart + 12, true),
      view.getFloat64(contentStart + 20, true),
      view.getFloat64(contentStart + 28, true),
    ] as [number, number, number, number];
    const partCount = view.getInt32(contentStart + 36, true);
    const pointCount = view.getInt32(contentStart + 40, true);
    const partsStart = contentStart + 44;
    const pointsStart = partsStart + partCount * 4;
    const starts: number[] = [];
    for (let p = 0; p < partCount; p += 1) starts.push(view.getInt32(partsStart + p * 4, true));
    const parts: [number, number][][] = [];
    for (let p = 0; p < partCount; p += 1) {
      const start = starts[p];
      const end = p + 1 < starts.length ? starts[p + 1] : pointCount;
      const ring: [number, number][] = [];
      for (let i = start; i < end; i += 1) {
        const pointOffset = pointsStart + i * 16;
        ring.push([view.getFloat64(pointOffset, true), view.getFloat64(pointOffset + 8, true)]);
      }
      if (ring.length >= 2) parts.push(ring);
    }
    geometries.push({ points: parts, bbox: box });
    cursor = contentStart + contentBytes;
  }
  return { shapeType, geometries };
}

export function parseShapefile(shp: Uint8Array, dbf: Uint8Array, prj = ""): ShapefileLayer {
  const parsed = parseShp(shp);
  const table = decodeDbf(dbf);
  const records: ShapeRecord[] = parsed.geometries.map((geometry, index) => ({
    points: geometry.points,
    bbox: geometry.bbox,
    attributes: table.rows[index] ?? {},
    areaM2: parsed.shapeType === 5 || parsed.shapeType === 15 || parsed.shapeType === 25 ? polygonArea(geometry.points) : 0,
  }));
  return { shapeType: parsed.shapeType, records, fields: table.fields, prj };
}

export function findField(fields: string[], candidates: string[]): string | undefined {
  const normalized = new Map(fields.map((field) => [normalize(field), field]));
  for (const candidate of candidates) {
    const direct = normalized.get(normalize(candidate));
    if (direct) return direct;
  }
  return fields.find((field) => candidates.some((candidate) => normalize(field).includes(normalize(candidate))));
}

export function uniqueValues(records: ShapeRecord[], field?: string): string[] {
  if (!field) return [];
  return [...new Set(records.map((record) => record.attributes[field] ?? "").filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function matches(record: ShapeRecord, field: string | undefined, value: string): boolean {
  if (!field || !value) return false;
  return normalize(record.attributes[field]) === normalize(value);
}
