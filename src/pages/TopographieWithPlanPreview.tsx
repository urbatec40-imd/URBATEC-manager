import { useEffect, useState } from 'react';
import type { Feature, Geometry, Position } from 'geojson';
import L from 'leaflet';
import { TopographiePage } from './TopographiePage';
import { CadastralPlanPreview, type CadastralAdmin, type CadastralNeighbor } from '../components/CadastralPlanPreview';

type Props = Record<string, unknown>;
type Parcel = Feature<Geometry, Props>;
type Bounds = { minX:number; maxX:number; minY:number; maxY:number };

const FEATURE_STORE: Parcel[] = [];
let hooked = false;

const textOf=(value:unknown)=>String(value??'').trim();
const digits=(value:unknown)=>textOf(value).replace(/[^0-9]/g,'');
const prop=(p:Props,keys:string[])=>{for(const key of keys){const value=p[key];if(value!==undefined&&value!==null&&textOf(value)!=='')return textOf(value)}return''};
const sectionOf=(p:Props)=>prop(p,['se_no','se_no_nat','section','SECTION']);
const ilotOf=(p:Props)=>prop(p,['il_no','il_no_nat','ilot','ILOT']);
const areaOf=(p:Props)=>prop(p,['SHAPE_Area','il_surf_de','il_surf_ca','area','AREA']);
const communeOf=(p:Props)=>prop(p,['commune','COMMUNE','municipality','MUNICIPALITE']);
const dairaOf=(p:Props)=>prop(p,['daira','DAIRA']);
const wilayaOf=(p:Props)=>prop(p,['wilaya','WILAYA','province','PROVINCE']);

const DAIRA_BY_COMMUNE:Record<string,string>={
  'Ain Touila':'Ain Touila','M\'Toussa':'Ain Touila','Babar':'Babar','Bouhmama':'Bouhmama','Chelia':'Bouhmama','M\'Sara':'Bouhmama','Yabous':'Bouhmama','Chechar':'Chechar','Djellal':'Chechar','El Ouldja':'Chechar','Khirane':'Chechar','Khenchela':'Khenchela','El Hamma':'El Hamma','Baghai':'El Hamma','Ensigha':'El Hamma','Tamza':'El Hamma','Kais':'Kais','Remila':'Kais','Taouzianat':'Kais','Ouled Rechache':'Ouled Rechache','El Mahmal':'Ouled Rechache'
};
function normalizeName(value:string){return value.trim().replace(/\s+/g,' ').replace(/’/g,"'");}

function ringOf(geometry:Geometry):Position[]{
  if(geometry.type==='Polygon')return geometry.coordinates[0]??[];
  if(geometry.type==='LineString')return geometry.coordinates??[];
  return[];
}
function boundsOf(ring:Position[]):Bounds{const xs=ring.map(p=>Number(p[0])),ys=ring.map(p=>Number(p[1]));return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}}
function bboxDistance(a:Bounds,b:Bounds){const dx=a.maxX<b.minX?b.minX-a.maxX:b.maxX<a.minX?a.minX-b.maxX:0;const dy=a.maxY<b.minY?b.minY-a.maxY:b.maxY<a.minY?a.minY-b.maxY:0;return Math.hypot(dx,dy)}
function captureFeature(feature:unknown){const f=feature as Parcel;if(!f?.geometry||!f?.properties)return;const key=`${String(f.id??'')}-${sectionOf(f.properties)}-${ilotOf(f.properties)}`;if(!FEATURE_STORE.some(item=>`${String(item.id??'')}-${sectionOf(item.properties??{})}-${ilotOf(item.properties??{})}`===key))FEATURE_STORE.push(f)}
function installLeafletCapture(){if(hooked)return;hooked=true;const proto=L.GeoJSON.prototype as any;const originalAddData=proto.addData;proto.addData=function(data:any){if(data?.type==='FeatureCollection'&&Array.isArray(data.features))data.features.forEach(captureFeature);else if(data?.type==='Feature')captureFeature(data);return originalAddData.call(this,data)}}

function clipRingToBox(ring:Position[],box:Bounds):Position[]{
  const clip=(points:Position[],inside:(p:Position)=>boolean,intersect:(a:Position,b:Position)=>Position):Position[]=>{const out:Position[]=[];if(!points.length)return out;let prev=points[points.length-1];let prevIn=inside(prev);for(const cur of points){const curIn=inside(cur);if(curIn&&!prevIn)out.push(intersect(prev,cur));if(curIn)out.push(cur);else if(prevIn)out.push(intersect(prev,cur));prev=cur;prevIn=curIn}return out};
  let out=ring.slice();
  out=clip(out,p=>Number(p[0])>=box.minX,(a,b)=>{const t=(box.minX-Number(a[0]))/(Number(b[0])-Number(a[0])||1);return[box.minX,Number(a[1])+(Number(b[1])-Number(a[1]))*t]});
  out=clip(out,p=>Number(p[0])<=box.maxX,(a,b)=>{const t=(box.maxX-Number(a[0]))/(Number(b[0])-Number(a[0])||1);return[box.maxX,Number(a[1])+(Number(b[1])-Number(a[1]))*t]});
  out=clip(out,p=>Number(p[1])>=box.minY,(a,b)=>{const t=(box.minY-Number(a[1]))/(Number(b[1])-Number(a[1])||1);return[Number(a[0])+(Number(b[0])-Number(a[0]))*t,box.minY]});
  out=clip(out,p=>Number(p[1])<=box.maxY,(a,b)=>{const t=(box.maxY-Number(a[1]))/(Number(b[1])-Number(a[1])||1);return[Number(a[0])+(Number(b[0])-Number(a[0]))*t,box.maxY]});
  return out;
}

function findSelectedFromDom():Parcel|null{
  const body=document.body.innerText;
  const sMatch=body.match(/Section numero\s*:\s*([^\n]+)/i),iMatch=body.match(/Ilot numero\s*:\s*([^\n]+)/i);
  if(!sMatch||!iMatch)return null;const s=digits(sMatch[1]),i=digits(iMatch[1]);if(!s||!i)return null;
  return FEATURE_STORE.find(f=>digits(sectionOf(f.properties??{}))===s&&digits(ilotOf(f.properties??{}))===i)??null;
}
function currentCommune(){const input=document.querySelector<HTMLInputElement>('input[placeholder*="Commune"]');return normalizeName(input?.value??'');}
function adminFor(parcel:Parcel):CadastralAdmin{
  const p=parcel.properties??{};const commune=normalizeName(communeOf(p)||currentCommune()||'Khenchela');
  return {commune,daira:normalizeName(dairaOf(p)||DAIRA_BY_COMMUNE[commune]||'—'),wilaya:normalizeName(wilayaOf(p)||'Khenchela')};
}

export function TopographieWithPlanPreview(){
  const[open,setOpen]=useState(false),[selected,setSelected]=useState<Parcel|null>(null),[neighbors,setNeighbors]=useState<CadastralNeighbor[]>([]),[admin,setAdmin]=useState<CadastralAdmin>({commune:'Khenchela',daira:'—',wilaya:'Khenchela'});
  useEffect(()=>{
    installLeafletCapture();
    const onClick=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null,button=target?.closest('button');
      if(!button||!button.textContent?.toLowerCase().includes('extrait du plan'))return;
      const parcel=findSelectedFromDom();if(!parcel)return;
      const selectedRing=ringOf(parcel.geometry);if(selectedRing.length<3)return;
      const selectedBounds=boundsOf(selectedRing);const padX=Math.max(0.0003,(selectedBounds.maxX-selectedBounds.minX)*0.45),padY=Math.max(0.0003,(selectedBounds.maxY-selectedBounds.minY)*0.45);
      const context={minX:selectedBounds.minX-padX,maxX:selectedBounds.maxX+padX,minY:selectedBounds.minY-padY,maxY:selectedBounds.maxY+padY};
      const section=digits(sectionOf(parcel.properties??{}));
      const candidates=FEATURE_STORE.filter(f=>f!==parcel).filter(f=>digits(sectionOf(f.properties??{}))===section).map(f=>({f,ring:ringOf(f.geometry)})).filter(x=>x.ring.length>=3).map(x=>({ ...x,distance:bboxDistance(selectedBounds,boundsOf(x.ring)) })).sort((a,b)=>a.distance-b.distance).slice(0,6);
      const neighborView=candidates.map((x,index)=>({ring:clipRingToBox(x.ring,context),f:x.f,index})).filter(x=>x.ring.length>=2).map(x=>({id:`${String(x.f.id??x.index)}-neighbor`,ilot:ilotOf(x.f.properties??{})||`N${x.index+1}`,section:sectionOf(x.f.properties??{})||undefined,coordinates:x.ring}));
      setSelected(parcel);setNeighbors(neighborView);setAdmin(adminFor(parcel));setOpen(true);
    };
    document.addEventListener('click',onClick);return()=>document.removeEventListener('click',onClick);
  },[]);
  const ring=selected?ringOf(selected.geometry):[];const p=selected?.properties??{};
  return <><TopographiePage/><CadastralPlanPreview open={open} onClose={()=>setOpen(false)} commune={admin.commune} admin={admin} section={sectionOf(p)} ilot={ilotOf(p)} surface={areaOf(p)} selectedRing={ring} neighbors={neighbors}/></>;
}
