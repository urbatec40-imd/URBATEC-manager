export const TOPOGRAPHIE_ROOT = "C:\\URATEC_DATA\\TOPOGRAPHIE\\KHENCHELA";

export interface CommuneTopographieSource {
  code: string;
  name: string;
  fileName: string;
}

export const COMMUNES_KHENCHELA: CommuneTopographieSource[] = [
  { code: "01", name: "KHENCHELA", fileName: "KHENCHELA.shp" },
  { code: "02", name: "M'TOUSSA", fileName: "MTOUSSA.shp" },
  { code: "03", name: "KAIS", fileName: "KAIS.shp" },
  { code: "04", name: "BAGHAI", fileName: "BAGHAI.shp" },
  { code: "05", name: "EL HAMMA", fileName: "EL_HAMMA.shp" },
  { code: "06", name: "AIN TOUILA", fileName: "AIN_TOUIILA.shp" },
  { code: "07", name: "TAOUZIANAT", fileName: "TAOUZIANAT.shp" },
  { code: "08", name: "BOUHMAMA", fileName: "BOUHMAMA.shp" },
  { code: "09", name: "EL OUELDJA", fileName: "EL_OUELDJA.shp" },
  { code: "10", name: "REMILA", fileName: "REMILA.shp" },
  { code: "11", name: "CHECHAR", fileName: "CHECHAR.shp" },
  { code: "12", name: "DJELLAL", fileName: "DJELLAL.shp" },
  { code: "13", name: "BABAR", fileName: "BABAR.shp" },
  { code: "14", name: "TAMZA", fileName: "TAMZA.shp" },
  { code: "15", name: "ENSIGHA", fileName: "ENSIGHA.shp" },
  { code: "16", name: "OULED RECHACHE", fileName: "OULED_RECHACHE.shp" },
  { code: "17", name: "EL MAHMAL", fileName: "EL_MAHMAL.shp" },
  { code: "18", name: "M'SARA", fileName: "MSARA.shp" },
  { code: "19", name: "YABOUS", fileName: "YABOUS.shp" },
  { code: "20", name: "KHIRANE", fileName: "KHIRANE.shp" },
  { code: "21", name: "CHELIA", fileName: "CHELIA.shp" },
];

export function getCommuneSource(name: string): CommuneTopographieSource | undefined {
  return COMMUNES_KHENCHELA.find((commune) => commune.name === name);
}

export function getCommuneFolder(name: string): string {
  return `${TOPOGRAPHIE_ROOT}\\${name.replaceAll(" ", "_")}`;
}
