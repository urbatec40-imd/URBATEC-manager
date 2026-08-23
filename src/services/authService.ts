/*
 * authService â€” Authentification locale 100% offline (localStorage).
 * Mots de passe hashÃ©s avec SHA-256 (Web Crypto API), jamais en texte clair.
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
    throw new Error('Ce nom d\'utilisateur existe dÃ©jÃ ');
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

export function getUserById(id: string): User | null {
  const users = localDb.read<User>('users');
  return users.find((u) => u.id === id) ?? null;
}

export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const user = getUserById(userId);
  if (!user) return false;
  const hash = await hashPassword(password);
  return hash === user.password_hash;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const users = localDb.read<User>('users');
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('Utilisateur introuvable');
  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== user.password_hash) {
    throw new Error('Mot de passe actuel incorrect');
  }
  if (newPassword.length < 4) {
    throw new Error('Le nouveau mot de passe doit faire au moins 4 caractÃ¨res');
  }
  if (newPassword === currentPassword) {
    throw new Error('Le nouveau mot de passe doit Ãªtre diffÃ©rent de l\'ancien');
  }
  user.password_hash = await hashPassword(newPassword);
  localDb.write('users', users);
}

export async function updateProfile(
  userId: string,
  patch: { username?: string; nom_complet?: string }
): Promise<Session> {
  const users = localDb.read<User>('users');
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('Utilisateur introuvable');
  const newUsername = patch.username?.trim();
  if (newUsername && newUsername.toLowerCase() !== user.username.toLowerCase()) {
    const exists = users.some(
      (u) => u.id !== userId && u.username.toLowerCase() === newUsername.toLowerCase()
    );
    if (exists) throw new Error('Ce nom d\'utilisateur existe dÃ©jÃ ');
    if (newUsername.length < 2) throw new Error('Le nom d\'utilisateur doit faire au moins 2 caractÃ¨res');
    user.username = newUsername;
  }
  if (patch.nom_complet !== undefined && patch.nom_complet.trim()) {
    user.nom_complet = patch.nom_complet.trim();
  }
  localDb.write('users', users);
  return setSession(user);
}

export function listUsers(): Array<Omit<User, 'password_hash'>> {
  return localDb
    .read<User>('users')
    .map((u) => { const r = { ...u } as Record<string, unknown>; delete r.password_hash; return r as Omit<User, 'password_hash'>; });
}

function assertNotLastAdmin(users: User[], targetId: string): void {
  const target = users.find((u) => u.id === targetId);
  if (!target || target.role !== 'Administrateur') return;
  const otherAdmins = users.some((u) => u.id !== targetId && u.role === 'Administrateur');
  if (!otherAdmins) throw new Error('Action interdite : c\'est le dernier administrateur');
}

export async function adminCreateUser(
  actorId: string,
  username: string,
  nomComplet: string,
  password: string,
  role: UserRole = 'Utilisateur'
): Promise<void> {
  const actor = getUserById(actorId);
  if (!actor || actor.role !== 'Administrateur') {
    throw new Error('Seul un administrateur peut crÃ©er un utilisateur');
  }
  await signup(username, nomComplet, password, role);
}

export async function adminResetPassword(
  actorId: string,
  userId: string,
  newPassword: string
): Promise<void> {
  const actor = getUserById(actorId);
  if (!actor || actor.role !== 'Administrateur') {
    throw new Error('Seul un administrateur peut rÃ©initialiser un mot de passe');
  }
  if (newPassword.length < 4) {
    throw new Error('Le mot de passe doit faire au moins 4 caractÃ¨res');
  }
  const users = localDb.read<User>('users');
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('Utilisateur introuvable');
  user.password_hash = await hashPassword(newPassword);
  localDb.write('users', users);
}

export function updateUserRole(actorId: string, userId: string, role: UserRole): void {
  const actor = getUserById(actorId);
  if (!actor || actor.role !== 'Administrateur') {
    throw new Error('Seul un administrateur peut modifier les rÃ´les');
  }
  if (userId === actorId) throw new Error('Vous ne pouvez pas modifier votre propre rÃ´le');
  const users = localDb.read<User>('users');
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('Utilisateur introuvable');
  if (role === 'Utilisateur') assertNotLastAdmin(users, userId);
  user.role = role;
  localDb.write('users', users);
}

export function deleteUser(actorId: string, userId: string): void {
  const actor = getUserById(actorId);
  if (!actor || actor.role !== 'Administrateur') {
    throw new Error('Seul un administrateur peut supprimer un utilisateur');
  }
  if (userId === actorId) throw new Error('Vous ne pouvez pas supprimer votre propre compte');
  const users = localDb.read<User>('users');
  assertNotLastAdmin(users, userId);
  localDb.write('users', users.filter((u) => u.id !== userId));
}
