import { useEffect, useMemo, useState } from 'react';
import { FolderOpen, Trash2, MapPinned, Search, X } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import L from 'leaflet';
import { unzipSync, strFromU8 } from 'fflate';
import 'leaflet/dist/leaflet.css';

type Props = Record<string, unknown>;
type KmzLayer = { id: string; name: string; data: FeatureCollection<Geometry>; description: string; properties: Props };
type Parcel = Feature<Geometry, Props>;

const COMMUNES = ['Ain Touila','Babar','Baghai','Bouhmama','Chelia','Djellal','El Hamma','El Mahmal','Ensigha','Khenchela','Kais','Khirane',"M'Toussa",'Ouled Rechache','Remila','Tamza','Taouzianat','Yabous','El Ouldja',"R'Mila"];
const xmlText = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (s: string, n: string) => { const m = s.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)<\\/${n}>`, 'i')); return m ? xmlText(m[1]) : ''; };
const esc = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const coords = (s: string): Array<[number, number]> => s.trim().split(/\s+/).map(value => { const [x,y] = value.split(',').map(Number); return [x,y] as [number,number]; }).filter(([x,y]) => Number.isFinite(x) && Number.isFinite(y));

function parseKml(text: string): KmzLayer['data'] {
  const features: Parcel[] = [];
  const placemarks = [...text.matchAll(/<Placemark[\s\S]*?<\/Placemark>/gi)].map(m => m[0]);
  placemarks.forEach((pm, i) => {
    const name = esc(tag(pm, 'name')); const description = esc(tag(pm, 'description')); const ext: Props = {};
    [...pm.matchAll(/<Data[^>]*name=["']([^"']+)["'][^>]*>[\s\S]*?<value>([\s\S]*?)<\/value>[\s\S]*?<\/Data>/gi)].forEach(m => ext[m[1]] = esc(xmlText(m[2])));
    [...pm.matchAll(/<SimpleData[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/SimpleData>/gi)].forEach(m => ext[m[1]] = esc(xmlText(m[2])));
    const pol = pm.match(/<Polygon[\s\S]*?<\/Polygon>/i); const line = pm.match(/<LineString[\s\S]*?<\/LineString>/i); const point = pm.match(/<Point[\s\S]*?<\/Point>/i); let geometry: Geometry | null = null;
    if (pol) { const rings = [...pol[0].matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/gi)].map(m => coords(m[1])); if (rings.length) geometry = { type:'Polygon', coordinates:rings }; }
    else if (line) { const c = coords(tag(line[0], 'coordinates')); if (c.length) geometry = { type:'LineString', coordinates:c }; }
    else if (point) { const c = coords(tag(point[0], 'coordinates')); if (c.length) geometry = { type:'Point', coordinates:c[0] }; }
    if (geometry) features.push({ type:'Feature', id:`${i}`, geometry, properties:{ name, description, ...ext } });
  });
  return { type:'FeatureCollection', features };
}
function Fit({ data }: { data: FeatureCollection<Geometry> | null }) { const map = useMap(); useEffect(() => { if (!data?.features.length) return; const b = L.geoJSON(data as any).getBounds(); if (b.isValid()) map.fitBounds(b,{padding:[30,30],maxZoom:17}); },[data,map]); return null; }
function ZoomTo({ parcel }: { parcel: Parcel | null }) { const map = useMap(); useEffect(() => { if (!parcel) return; const b = L.geoJSON(parcel as any).getBounds(); if (b.isValid()) map.fitBounds(b,{padding:[50,50],maxZoom:19}); },[parcel,map]); return null; }
const prop = (p: Props, keys: string[]) => { for (const key of keys) { const exact = p[key]; if (exact !== undefined && exact !== null && String(exact).trim() !== '') return String(exact).trim(); const found = Object.keys(p).find(k => k.toUpperCase() === key.toUpperCase()); if (found && String(p[found]).trim() !== '') return String(p[found]).trim(); } return ''; };
const sectionOf = (p: Props) => prop(p,['se_no','se_no_nat']);
const ilotOf = (p: Props) => prop(p,['il_no','il_no_nat']);
const areaOf = (p: Props) => prop(p,['SHAPE_Area','shape_area','il_surf_de','il_surf_ca']);
const digits = (v: string) => v.replace(/\D/g,'');
const num = (v: string) => Number(digits(v) || '0');

function Info({ feature, onClose }: { feature: Parcel; onClose: () => void }) { const p = feature.properties || {}; return <div className="absolute z-[1000] bottom-4 left-4 max-w-sm rounded-xl bg-white shadow-xl border p-4"><div className="flex items-center justify-between gap-4"><strong>Parcelle cadastrale</strong><button type="button" onClick={onClose} className="text-slate-500"><X size={17}/></button></div><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><div className="rounded-lg bg-slate-50 p-2"><b className="block text-xs text-slate-500">Section</b>{sectionOf(p)||'—'}</div><div className="rounded-lg bg-slate-50 p-2"><b className="block text-xs text-slate-500">Ilot</b>{ilotOf(p)||'—'}</div><div className="rounded-lg bg-slate-50 p-2"><b className="block text-xs text-slate-500">Area</b>{areaOf(p)||'—'} m²</div></div></div>; }

export function TopographiePage() {
  const [layers,setLayers] = useState<KmzLayer[]>([]), [active,setActive] = useState<string[]>([]), [selected,setSelected] = useState<Parcel|null>(null), [commune,setCommune] = useState(''), [section,setSection] = useState(''), [ilot,setIlot] = useState(''), [status,setStatus] = useState('');
  const filtered = useMemo(() => { const q=commune.trim().toUpperCase(); if(!q)return COMMUNES; return COMMUNES.filter(c=>c.toUpperCase().includes(q)).sort((a,b)=>{const an=a.toUpperCase(),bn=b.toUpperCase(),as=an.startsWith(q),bs=bn.startsWith(q);if(as!==bs)return as?-1:1;return an.localeCompare(bn);}); },[commune]);
  const features = useMemo(() => layers.filter(l=>active.includes(l.id)).flatMap(l=>l.data.features as Parcel[]),[layers,active]);
  const parcelResults = useMemo(() => { const s=digits(section), i=digits(ilot); if(!s && !i)return []; return features.map(feature=>({feature,s:sectionOf(feature.properties||{}),i:ilotOf(feature.properties||{})})).filter(x=>{const sv=digits(x.s),iv=digits(x.i);return (!s||sv===s)&&(!i||iv===i);}).sort((a,b)=>{if(i){const target=num(i),da=Math.abs(num(a.i)-target),db=Math.abs(num(b.i)-target);if(da!==db)return da-db;}return num(a.s)-num(b.s);}).slice(0,100); },[features,section,ilot]);
  const importKmz = async(files:FileList|null) => { if(!files?.length)return; setStatus('Lecture des fichiers KMZ...'); try { const next:KmzLayer[]=[]; for(const file of Array.from(files).filter(f=>/\.kmz$/i.test(f.name))){const zip=unzipSync(new Uint8Array(await file.arrayBuffer()));const key=Object.keys(zip).find(k=>/\.kml$/i.test(k));if(!key)continue;const data=parseKml(strFromU8(zip[key]));next.push({id:`${file.name}-${file.lastModified}`,name:file.name,data,description:`${data.features.length} éléments`,properties:{source:file.name}});} if(!next.length)throw new Error('Aucun KMZ valide trouvé.'); setLayers(old=>[...old,...next]);setActive(old=>[...old,...next.map(x=>x.id)]);setSelected(null);setStatus(`${next.length} fichier(s) KMZ chargé(s).`);}catch(e){setStatus(`Erreur KMZ : ${(e as Error).message}`);} };
  const remove=(id:string)=>{setLayers(v=>v.filter(x=>x.id!==id));setActive(v=>v.filter(x=>x!==id));setSelected(null);};
  const chooseCommune=(name:string)=>{setCommune(name);setSection('');setIlot('');setSelected(null);};
  return <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-800">Topographie — Cartes KMZ</h1><p className="text-sm text-slate-500 mt-1">Cartographie cadastrale locale • Commune • Section • Ilot • Area</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><FolderOpen size={17}/> Ajouter fichiers KMZ<input type="file" className="hidden" multiple accept=".kmz" onChange={e=>importKmz(e.target.files)}/></label></div>
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4"><aside className="bg-white border rounded-xl shadow-sm p-4"><h2 className="font-semibold text-slate-800 flex items-center gap-2"><MapPinned size={17}/> Recherche cadastrale</h2><input value={commune} onChange={e=>setCommune(e.target.value)} placeholder="Commune (ex. K)" className="mt-3 w-full rounded-lg border px-3 py-2"/><div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">{filtered.length?filtered.map(name=><button key={name} type="button" onClick={()=>chooseCommune(name)} className={`w-full px-3 py-2 text-left text-sm ${commune===name?'bg-sky-600 text-white font-semibold':'text-slate-700 hover:bg-sky-50'}`}>{name}</button>):<div className="px-3 py-2 text-sm text-slate-500">Aucune commune trouvée</div>}</div>
      {commune&&<><div className="mt-4 grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-600">SECTION<input value={section} onChange={e=>setSection(e.target.value)} inputMode="numeric" placeholder="15" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600">ILOT<input value={ilot} onChange={e=>setIlot(e.target.value)} inputMode="numeric" placeholder="245" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label></div><div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Search size={14}/>{parcelResults.length?`${parcelResults.length} résultat(s)`:(section||ilot)?'Aucun résultat':'Saisir Section et/ou Ilot'}</div><div className="mt-2 max-h-64 overflow-y-auto space-y-1">{parcelResults.map(({feature})=>{const p=feature.properties||{};return <button key={String(feature.id)} type="button" onClick={()=>setSelected(feature)} className="w-full rounded-lg border p-2 text-left hover:bg-sky-50"><div className="flex justify-between gap-2 text-sm font-semibold"><span>Section {sectionOf(p)||'—'} • Ilot {ilotOf(p)||'—'}</span><span>{areaOf(p)||'—'} m²</span></div></button>;})}</div></>}
      <div className="mt-4 space-y-2">{layers.map(l=><div key={l.id} className="rounded-lg border p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={active.includes(l.id)} onChange={()=>setActive(v=>v.includes(l.id)?v.filter(x=>x!==l.id):[...v,l.id])}/>{l.name}</label><div className="text-xs text-slate-500 mt-1">{l.description}</div><button type="button" onClick={()=>remove(l.id)} className="mt-2 text-xs text-red-600 flex items-center gap-1"><Trash2 size={13}/> Retirer</button></div>)}</div>{status&&<div className="mt-3 text-xs text-slate-600">{status}</div>}</aside><div className="relative bg-white border rounded-xl overflow-hidden shadow-sm h-[650px]"><MapContainer center={[35.435,7.143]} zoom={11} className="h-full w-full"><TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{layers.filter(l=>active.includes(l.id)).map(l=><GeoJSON key={l.id} data={l.data as any} style={()=>({color:'#2563eb',weight:2,fillOpacity:.12})} onEachFeature={(feature,layer)=>layer.on({click:()=>setSelected(feature as any)})}/>)}<Fit data={layers.filter(l=>active.includes(l.id)).reduce<FeatureCollection<Geometry>>((acc,l)=>({...acc,features:[...acc.features,...l.data.features]}),{type:'FeatureCollection',features:[]})}/><ZoomTo parcel={selected}/></MapContainer>{selected&&<Info feature={selected} onClose={()=>setSelected(null)}/>}</div></div></div>;
}
