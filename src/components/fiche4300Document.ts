export interface Fiche4300Data {
  dossierNo1: string;
  dossierNo2: string;
  demandeur: {
    nom: string;
    prenom: string;
    naissance: string;
    nin: string;
    nif: string;
    adresse: string;
    telephone: string;
  };
  mandataire: {
    nom: string;
    prenom: string;
    nomPere: string;
    naissance: string;
    procuration: string;
    redacteur: string;
    telephone: string;
  } | null;
  bien: {
    commune: string;
    section: string;
    ilot: string;
    partie: string;
    lieuDit: string;
    natureBien: string;
    regulPartie: boolean;
    regulTotalite: boolean;
  };
  documents: string[];
}

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const DOTS = (n: number): string => '.'.repeat(Math.max(n, 3));

const NBSP = '\u00A0';

function val(v: string | undefined | null, dots: number): string {
  const t = String(v ?? '').trim();
  return t ? `${NBSP}${esc(t)}${NBSP}` : `${NBSP}${DOTS(dots)}${NBSP}`;
}

const CSS = `
@page{size:21.59cm 27.94cm;margin:14.2pt 50.4pt 10pt 50.4pt;}
*{box-sizing:border-box;}
body{margin:0;font-family:'Calibri','Carlito',Arial,sans-serif;font-size:11pt;color:#000;background:#ffffff;line-height:1.17;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.sheet{width:21.59cm;min-height:27.94cm;padding:14.2pt 50.4pt 24pt;margin:0 auto;}
p{margin:0;}
.h1{font-size:14pt;font-weight:bold;text-align:center;margin-bottom:2pt;}
.h1b{font-size:14pt;font-weight:bold;text-align:center;margin-bottom:12pt;}
.dir{font-size:10pt;font-weight:bold;text-align:center;margin-bottom:2pt;}
.spacer{font-size:3pt;margin-bottom:6pt;}
.title{font-size:14pt;font-weight:bold;text-align:center;margin-bottom:4pt;}
.sub{font-size:10.5pt;text-align:center;margin-bottom:3pt;}
.subb{font-size:10.5pt;font-weight:bold;text-align:center;margin-bottom:16pt;}
.sec{font-size:11pt;font-weight:bold;margin-bottom:4pt;}
.f{font-size:11pt;margin-bottom:5pt;}
.secb{font-size:11pt;font-weight:bold;margin-bottom:4pt;}
.secb .small{font-size:10.5pt;font-weight:normal;}
.chk{font-size:11pt;margin-bottom:5pt;white-space:pre-wrap;}
.lawwrap{margin:6pt 0 0;}
table.law{border-collapse:collapse;margin:0 auto;width:489.6pt;background:#F2F2F2;}
table.law td{border:0.75pt solid #000000;padding:4pt 7.2pt;font-size:9.5pt;}
.sign{font-size:10.5pt;font-weight:bold;text-align:right;margin-top:30pt;padding-right:36pt;}
@media screen{
  html,body{background:#dbe3ec;}
  .sheet{background:#ffffff;box-shadow:0 12px 45px rgba(15,23,42,.28);margin:18px auto;}
}
@media print{
  html,body{background:#ffffff;}
  .sheet{width:auto;min-height:auto;padding:0;margin:0;box-shadow:none;}
}
`.trim();

export function buildFiche4300Html(data: Fiche4300Data): string {
  const d = data.demandeur;
  const m = data.mandataire;
  const b = data.bien;

  const ninNif = [d.nin, d.nif]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(' / ');

  const chkX = (on: boolean) => (on ? 'X' : NBSP);
  const regulLine =
    `Nature de régularisation : Partie du bien${NBSP}${NBSP}[${NBSP}${chkX(b.regulPartie)}${NBSP}]`
    + NBSP.repeat(38)
    + `Totalité du bien${NBSP}${NBSP}[${NBSP}${chkX(b.regulTotalite)}${NBSP}]`;

  let docsHtml: string;
  if (data.documents.length > 0) {
    docsHtml = data.documents
      .map(
        (label, i) =>
          `<p class="f">${NBSP}${i + 1}.${NBSP}${esc(label)}</p>`
      )
      .join('');
  } else {
    docsHtml =
      `<p class="f">${DOTS(171)}</p><p class="f">${DOTS(171)}</p>`;
  }

  const mandataireBlock = m
    ? `<p class="f">Nom :${val(m.nom, 40)} / Prénom :${val(m.prenom, 40)} / Nom du père :${val(m.nomPere, 37)}</p>`
      + `<p class="f">Date et lieu de naissance :${val(m.naissance, 133)}</p>`
      + `<p class="f">Date et numéro de la procuration :${val(m.procuration, 121)}</p>`
      + `<p class="f">Rédacteur de la procuration :${val(m.redacteur, 129)}</p>`
      + `<p class="f">Téléphone :${val(m.telephone, 158)}</p>`
    : `<p class="f">Nom :${DOTS(40)} / Prénom :${DOTS(40)} / Nom du père :${DOTS(37)}</p>`
      + `<p class="f">Date et lieu de naissance :${DOTS(133)}</p>`
      + `<p class="f">Date et numéro de la procuration :${DOTS(121)}</p>`
      + `<p class="f">Rédacteur de la procuration :${DOTS(129)}</p>`
      + `<p class="f">Téléphone :${DOTS(158)}</p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Fiche de renseignements — Instruction 4300</title>
<style>${CSS}</style>
</head>
<body>
<div class="sheet">
<p class="h1">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</p>
<p class="h1b">MINISTÈRE DES FINANCES</p>
<p class="dir">DIRECTION GÉNÉRALE DES DOMAINES NATIONAUX</p>
<p class="dir">DIRECTION RÉGIONALE DES DOMAINES NATIONAUX DE LA RÉGION DE CONSTANTINE</p>
<p class="dir">DIRECTION DE CADASTRE ET DE LA CONSERVATION FONCIÈRE DE LA WILAYA DE KHENCHELA</p>
<p class="spacer">&nbsp;</p>
<p class="title">FICHE DE RENSEIGNEMENTS</p>
<p class="sub">Demande de régularisation immobilière dans le cadre de l'article 166 de la loi de finances pour l'année 2025</p>
<p class="sub">Instruction n° 4300 du 10/03/2025</p>
<p class="subb">(N° du dossier :${val(data.dossierNo1, 6)} /${val(data.dossierNo2, 5)})</p>

<p class="sec">DEMANDEUR :</p>
<p class="f">Nom et prénom / Raison sociale :${val(d.nom, 63)} / Prénom :${val(d.prenom, 60)}</p>
<p class="f">Date et lieu de naissance :${val(d.naissance, 133)}</p>
<p class="f">NIN / NIF :${val(ninNif, 159)}</p>
<p class="f">Adresse :${val(d.adresse, 162)}</p>
<p class="f">Téléphone :${val(d.telephone, 158)}</p>

<p class="secb">MANDATAIRE <span class="small">(le cas échéant) :</span></p>
${mandataireBlock}

<p class="sec">DÉSIGNATION DU BIEN :</p>
<p class="f">Commune :${val(b.commune, 24)} / Section :${val(b.section, 24)} / Ilot :${val(b.ilot, 24)} / N° de la partie :${val(b.partie, 21)}</p>
<p class="f">Cité ou lieu-dit :${val(b.lieuDit, 151)}</p>
<p class="f">Nature de bien :${val(b.natureBien, 154)}</p>
<p class="chk">${regulLine}</p>
<p class="f">Documents fournis :</p>
${docsHtml}

<div class="lawwrap">
<table class="law"><tr><td><span style="font-weight:bold">ARTICLE 223 DU CODE PÉNAL :</span> Quiconque obtient, indûment, par de fausses déclarations, en prenant un faux nom ou de faux titres, ou en fournissant des renseignements, attestations ou déclarations inexacts ou erronés, le droit ou l'usage de biens relevant des domaines publics, sera puni d'un emprisonnement de trois mois à trois ans et d'une amende de 500 à 5.000 DA.</td></tr></table>
</div>

<p class="sign">SIGNATURE ET EMPREINTE:</p>
</div>
</body>
</html>`;
}

export function fiche4300FileName(data: Fiche4300Data): string {
  const base = (data.demandeur.nom || data.demandeur.prenom || 'sans_nom')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return `fiche_renseignements_4300_${base || 'sans_nom'}.doc`;
}

export function downloadFiche4300(html: string, filename: string): void {
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function printFiche4300(html: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(frame);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = frame.contentWindow;
  if (win) {
    win.focus();
    setTimeout(() => {
      try {
        win.print();
      } finally {
        setTimeout(() => {
          if (frame.parentNode === document.body) document.body.removeChild(frame);
        }, 500);
      }
    }, 250);
  }
}
