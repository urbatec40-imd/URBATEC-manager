import { useEffect, useState } from 'react';
import type { Client } from '@/types';
import type { Feature, Geometry, Position } from 'geojson';
import L from 'leaflet';
import { TopographiePage } from './TopographiePage';
import { CadastralPlanSheet, type CadastralAdmin, type CadastralNeighbor } from '../components/CadastralPlanSheet';
import { Demande4300Page } from '../components/Demande4300Page';

type Props=Record<string,unknown>; type Parcel=Feature<Geometry,Props>; type Bounds={minX:number;maxX:number;minY:number;maxY:number};
const STORE:Parcel[]=[];let hooked=false;
const text=(v:unknown)=>String(v??'').trim(),digits=(v:unknown)=>text(v).replace(/[^0-9]/g,'');
const prop=(p:Props,keys:string[])=>{for(const k of keys){const v=p[k];if(v!==undefined&&v!==null&&text(v)!=='')return text(v)}return''};
const sectionOf=(p:Props)=>prop(p,['se_no','se_no_nat','section','SECTION']),ilotOf=(p:Props)=>prop(p,['il_no','il_no_nat','ilot','ILOT']),areaOf=(p:Props)=>prop(p,['SHAPE_Area','il_surf_de','il_surf_ca','area','AREA']);
const communeOf=(p:Props)=>prop(p,['commune','COMMUNE','municipality','MUNICIPALITE']),dairaOf=(p:Props)=>prop(p,['daira','DAIRA']),wilayaOf=(p:Props)=>prop(p,['wilaya','WILAYA','province','PROVINCE']);
const DAIRA_BY_COMMUNE:Record<string,string>={'Ain Touila':'Ain Touila',"M'Toussa":'Ain Touila','Babar':'Babar','Bouhmama':'Bouhmama','Chelia':'Bouhmama',"M'Sara":'Bouhmama','Yabous':'Bouhmama','Chechar':'Chechar','Djellal':'Chechar','El Ouldja':'Chechar','Khirane':'Chechar','Khenchela':'Khenchela','El Hamma':'El Hamma','Baghai':'El Hamma','Ensigha':'El Hamma','Tamza':'El Hamma','Kais':'Kais','Remila':'Kais','Taouzianat':'Kais','Ouled Rechache':'Ouled Rechache','El Mahmal':'Ouled Rechache'};
const ringOf=(g:Geometry):Position[]=>g.type==='Polygon'?(g.coordinates[0]??[]):g.type==='LineString'?(g.coordinates??[]):[];
const bounds=(r:Position[]):Bounds=>{const xs=r.map(p=>+p[0]),ys=r.map(p=>+p[1]);return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}};
const dist=(a:Bounds,b:Bounds)=>{
  let dx=0;
  let dy=0;
  if(a.maxX<b.minX){
    dx=b.minX-a.maxX;
  }else if(b.maxX<a.minX){
    dx=a.minX-b.maxX;
  }
  if(a.maxY<b.minY){
    dy=b.minY-a.maxY;
  }else if(b.maxY<a.minY){
    dy=a.minY-b.maxY;
  }
  return Math.hypot(dx,dy);
};
const capture=(x:unknown)=>{const f=x as Parcel;if(!f?.geometry||!f.properties)return;const k=`${String(f.id??'')}-${sectionOf(f.properties)}-${ilotOf(f.properties)}`;if(!STORE.some(z=>`${String(z.id??'')}-${sectionOf(z.properties??{})}-${ilotOf(z.properties??{})}`===k))STORE.push(f)};
function install(){if(hooked)return;hooked=true;const p=L.GeoJSON.prototype as any,o=p.addData;p.addData=function(data:any){if(data?.type==='FeatureCollection'&&Array.isArray(data.features))data.features.forEach(capture);else if(data?.type==='Feature')capture(data);return o.call(this,data)}}
function selectedFromDom(){const body=document.body.innerText,s=body.match(/Section numero\s*:\s*([^\n]+)/i),i=body.match(/Ilot numero\s*:\s*([^\n]+)/i);if(!s||!i)return null;const ss=digits(s[1]),ii=digits(i[1]);return STORE.find(f=>digits(sectionOf(f.properties??{}))===ss&&digits(ilotOf(f.properties??{}))===ii)??null}
function currentCommune(){const el=document.querySelector<HTMLInputElement>('input[placeholder*="Commune"]');return text(el?.value)}
function adminFor(p:Parcel):CadastralAdmin{const pr=p.properties??{},c=text(communeOf(pr)||currentCommune()||'Khenchela');return{commune:c,daira:text(dairaOf(pr)||DAIRA_BY_COMMUNE[c]||'—'),wilaya:text(wilayaOf(pr)||'Khenchela')}}

export function TopographieWithPlanPreviewLite({clients,onUpdateClient}:{clients:Client[];onUpdateClient:(id:string,data:Partial<Client>)=>Promise<void>}){
 const[open,setOpen]=useState(false),[selected,setSelected]=useState<Parcel|null>(null),[neighbors,setNeighbors]=useState<CadastralNeighbor[]>([]),[admin,setAdmin]=useState<CadastralAdmin>({commune:'Khenchela',daira:'—',wilaya:'Khenchela'}),[demandeOpen,setDemandeOpen]=useState(false);
 useEffect(()=>{install();const onClick=(e:MouseEvent)=>{const btn=(e.target as HTMLElement|null)?.closest('button');if(!btn)return;const label=btn.textContent?.toLowerCase()||'';
   if(label.includes('demande 4300')){e.preventDefault();e.stopPropagation();const p=selectedFromDom();if(p){setSelected(p);setAdmin(adminFor(p));}setDemandeOpen(true);return;}
   if(!label.includes('extrait du plan'))return;
   const p=selectedFromDom();if(!p)return;const r=ringOf(p.geometry);if(r.length<3)return;const b=bounds(r);const near=STORE.filter(f=>f!==p).map(f=>({f,r:ringOf(f.geometry)})).filter(x=>x.r.length>2).map(x=>({...x,d:dist(b,bounds(x.r))})).sort((a,b)=>a.d-b.d).slice(0,4).map((x,i)=>({id:String(x.f.id??i),ilot:ilotOf(x.f.properties??{})||`N${i+1}`,section:sectionOf(x.f.properties??{})||undefined,coordinates:x.r}));setSelected(p);setNeighbors(near);setAdmin(adminFor(p));setOpen(true)};document.addEventListener('click',onClick,true);return()=>document.removeEventListener('click',onClick,true)},[]);
 const pr=selected?.properties??{};
 return <>{!demandeOpen&&<><TopographiePage/><CadastralPlanSheet open={open} onClose={()=>setOpen(false)} commune={admin.commune} admin={admin} section={sectionOf(pr)} ilot={ilotOf(pr)} surface={areaOf(pr)} selectedRing={selected?ringOf(selected.geometry):[]} neighbors={neighbors}/></>}{demandeOpen&&<Demande4300Page clients={clients} onUpdateClient={onUpdateClient} parcel={selected} onClose={()=>setDemandeOpen(false)}/>}</>;
}