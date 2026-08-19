/*
 * authService — Authentification locale 100% offline (localStorage).
 * Mots de passe hashés avec SHA-256 (Web Crypto API), jamais en texte clair.
 */

import { localDb } from './localDb';
import type { User, Session, UserRole } from '@/types';

const SESSION_KEY = 'uratec_session';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signup(
  username: string,
  nomComplet: string,
  password: string,
  role: UserRole = 'Utilisateur'
): Promise<Session> {
  const users = localDb.read<User>('users');
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Ce nom d\'utilisateur existe déjà');
  }
  const passwordHash = await hashPassword(password);
  const user: User = {
    id: localDb.genId(),
    username: username.trim(),
    nom_complet: nomComplet.trim(),
    password_hash: passwordHash,
    role,
    created_at: localDb.nowISO(),
  };
  users.push(user);
  localDb.write('users', users);
  return setSession(user);
}

export async function login(
  username: string,
  password: string
): Promise<Session> {
  const users = localDb.read<User>('users');
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (!user) throw new Error('Utilisateur introuvable');
  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.password_hash) {
    throw new Error('Mot de passe incorrect');
  }
  return setSession(user);
}

function setSession(user: User): Session {
  const session: Session = {
    user_id: user.id,
    username: user.username,
    nom_complet: user.nom_complet,
    role: user.role,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function hasUsers(): boolean {
  const users = localDb.read<User>('users');
  return users.length > 0;
}
