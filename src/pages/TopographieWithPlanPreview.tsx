import { useEffect, useState } from 'react';
import type { Feature, Geometry, Position } from 'geojson';
import L from 'leaflet';
import { TopographiePage } from './TopographiePage';
import { CadastralPlanPreview, type CadastralNeighbor } from '../components/CadastralPlanPreview';

type Props = Record<string, unknown>;
type Parcel = Feature<Geometry, Props>;

type StoredFeature = Parcel;

type Bounds = { minX:number; maxX:number; minY:number; maxY:number };

const FEATURE_STORE: StoredFeature[] = [];
let hooked = false;

const textOf = (value: unknown) => String(value ?? '').trim();
const digits = (value: unknown) => textOf(value).replace(/[^0-9]/g, '');
const prop = (p: Props, keys: string[]) => {
  for (const key of keys) {
    const value = p[key];
    if (value !== undefined && value !== null && textOf(value) !== '') return textOf(value);
  }
  return '';
};
const sectionOf = (p: Props) => prop(p, ['se_no','se_no_nat','section','SECTION']);
const ilotOf = (p: Props) => prop(p, ['il_no','il_no_nat','ilot','ILOT']);
const areaOf = (p: Props) => prop(p, ['SHAPE_Area','il_surf_de','il_surf_ca','area','AREA']);

function ringOf(geometry: Geometry): Position[] {
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? [];
  if (geometry.type === 'LineString') return geometry.coordinates ?? [];
  return [];
}

function boundsOf(ring: Position[]): Bounds {
  const xs = ring.map(p => Number(p[0]));
  const ys = ring.map(p => Number(p[1]));
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function bboxDistance(a: Bounds, b: Bounds) {
  const dx = a.maxX < b.minX ? b.minX - a.maxX : b.maxX < a.minX ? a.minX - b.maxX : 0;
  const dy = a.maxY < b.minY ? b.minY - a.maxY : b.maxY < a.minY ? a.minY - b.maxY : 0;
  return Math.hypot(dx, dy);
}

function captureFeature(feature: unknown) {
  const f = feature as StoredFeature;
  if (!f?.geometry || !f?.properties) return;
  const key = `${String(f.id ?? '')}-${sectionOf(f.properties)}-${ilotOf(f.properties)}`;
  const exists = FEATURE_STORE.some(item => `${String(item.id ?? '')}-${sectionOf(item.properties ?? {})}-${ilotOf(item.properties ?? {})}` === key);
  if (!exists) FEATURE_STORE.push(f);
}

function installLeafletCapture() {
  if (hooked) return;
  hooked = true;
  const proto = L.GeoJSON.prototype as any;
  const originalAddData = proto.addData;
  proto.addData = function (data: any) {
    if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) data.features.forEach(captureFeature);
    else if (data?.type === 'Feature') captureFeature(data);
    return originalAddData.call(this, data);
  };
}

function findSelectedFromDom(): Parcel | null {
  const body = document.body.innerText;
  const matchSection = body.match(/Section numero\s*:\s*([^\n]+)/i);
  const matchIlot = body.match(/Ilot numero\s*:\s*([^\n]+)/i);
  if (!matchSection || !matchIlot) return null;
  const s = digits(matchSection[1]);
  const i = digits(matchIlot[1]);
  if (!s || !i) return null;
  return FEATURE_STORE.find(f => digits(sectionOf(f.properties ?? {})) === s && digits(ilotOf(f.properties ?? {})) === i) ?? null;
}

export function TopographieWithPlanPreview() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Parcel | null>(null);
  const [neighbors, setNeighbors] = useState<CadastralNeighbor[]>([]);

  useEffect(() => {
    installLeafletCapture();
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button || !button.textContent?.toLowerCase().includes('extrait du plan')) return;
      const parcel = findSelectedFromDom();
      if (!parcel) return;
      const section = digits(sectionOf(parcel.properties ?? {}));
      const selectedRing = ringOf(parcel.geometry);
      if (selectedRing.length < 3) return;
      const selectedBounds = boundsOf(selectedRing);
      const candidates = FEATURE_STORE
        .filter(f => f !== parcel)
        .filter(f => digits(sectionOf(f.properties ?? {})) === section)
        .map(f => ({ f, ring: ringOf(f.geometry) }))
        .filter(x => x.ring.length >= 3)
        .map(x => ({ ...x, distance: bboxDistance(selectedBounds, boundsOf(x.ring)) }))
        .sort((a,b) => a.distance - b.distance)
        .slice(0, 8);
      setSelected(parcel);
      setNeighbors(candidates.map((x, index) => ({
        id: `${String(x.f.id ?? index)}-neighbor`,
        ilot: ilotOf(x.f.properties ?? {}) || `N${index + 1}`,
        section: sectionOf(x.f.properties ?? {}) || undefined,
        coordinates: x.ring,
      })));
      setOpen(true);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const ring = selected ? ringOf(selected.geometry) : [];
  const p = selected?.properties ?? {};
  const surface = areaOf(p);
  return <>
    <TopographiePage />
    <CadastralPlanPreview
      open={open}
      onClose={() => setOpen(false)}
      commune="Khenchela"
      section={sectionOf(p)}
      ilot={ilotOf(p)}
      surface={surface}
      selectedRing={ring}
      neighbors={neighbors}
    />
  </>;
}
