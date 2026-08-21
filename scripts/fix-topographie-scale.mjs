import fs from 'node:fs';

const file = 'src/pages/TopographiePage.tsx';
let s = fs.readFileSync(file, 'utf8');

const old = 'const contentW=Math.min(drawW,groundW*1000/scale),contentH=Math.min(drawH,groundH*1000/scale),ox=margin+(drawW-contentW)/2,oy=margin+topH+(drawH-contentH)/2;';
const replacement = 'const fitScale=Math.max(1,groundW*1000/Math.max(1,drawW-4),groundH*1000/Math.max(1,drawH-4));if(scale<fitScale)scale=Math.ceil(fitScale/50)*50;const contentW=groundW*1000/scale,contentH=groundH*1000/scale,ox=margin+(drawW-contentW)/2,oy=margin+topH+(drawH-contentH)/2;';

if (!s.includes(old)) {
  console.log('Topographie scale fix already applied or source changed.');
  process.exit(0);
}

s = s.replace(old, replacement);
fs.writeFileSync(file, s, 'utf8');
console.log('Topographie extract-plan scale/layout fix applied.');
