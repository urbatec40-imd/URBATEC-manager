/*
 * localDb — Couche de persistance 100% locale (localStorage).
 * Remplace Supabase pour le fonctionnement hors ligne.
 */

const STORAGE_PREFIX = 'uratec_';

function getKey(table: string): string {
  return `${STORAGE_PREFIX}${table}`;
}

function read<T>(table: string): T[] {
  try {
    const raw = localStorage.getItem(getKey(table));
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function write<T>(table: string, rows: T[]): void {
  localStorage.setItem(getKey(table), JSON.stringify(rows));
}

export function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}

export const localDb = {
  read,
  write,
  genId,
  nowISO,
};
