import emailjs from '@emailjs/browser';

const RECOVERY_EMAILS_KEY = 'uratec_recovery_emails';
const RESET_REQUEST_KEY = 'uratec_password_reset_request';
const RESET_CODE_TTL_MS = 10 * 60 * 1000;

const EMAILJS_SERVICE_ID = (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined)?.trim() || '';
const EMAILJS_TEMPLATE_ID = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined)?.trim() || '';
const EMAILJS_PUBLIC_KEY = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined)?.trim() || '';

function readEmails(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(RECOVERY_EMAILS_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getRecoveryEmail(username: string): string {
  return readEmails()[normalizeUsername(username)] || '';
}

export function setRecoveryEmail(username: string, email: string): void {
  const key = normalizeUsername(username);
  const value = email.trim().toLowerCase();
  if (!key) throw new Error('Utilisateur invalide');
  if (value && !/^\S+@\S+\.\S+$/.test(value)) throw new Error('Adresse Email invalide');
  const values = readEmails();
  if (value) values[key] = value;
  else delete values[key];
  localStorage.setItem(RECOVERY_EMAILS_KEY, JSON.stringify(values));
}

function readResetRequest(): { username: string; email: string; codeHash: string; expiresAt: number } | null {
  try {
    const raw = localStorage.getItem(RESET_REQUEST_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { username: string; email: string; codeHash: string; expiresAt: number };
    if (!value?.username || !value?.email || !value?.codeHash || !value?.expiresAt) return null;
    if (Date.now() > value.expiresAt) {
      localStorage.removeItem(RESET_REQUEST_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function hasConfiguredEmailJS(): boolean {
  return Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
}

export function hasPendingReset(username: string): boolean {
  const request = readResetRequest();
  return Boolean(request && request.username === normalizeUsername(username));
}

export async function requestPasswordReset(username: string): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Une connexion Internet est nécessaire pour récupérer le mot de passe.');
  }
  if (!hasConfiguredEmailJS()) {
    throw new Error('Le service EmailJS n’est pas configuré. Ajoutez Service ID, Template ID et Public Key.');
  }

  const normalized = normalizeUsername(username);
  if (!normalized) throw new Error('Nom d’utilisateur invalide.');

  const email = getRecoveryEmail(normalized);
  if (!email) {
    throw new Error('Aucune adresse Email de récupération n’est enregistrée pour cet utilisateur.');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + RESET_CODE_TTL_MS;
  const codeHash = await hashCode(code);

  localStorage.setItem(
    RESET_REQUEST_KEY,
    JSON.stringify({ username: normalized, email, codeHash, expiresAt })
  );

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email: email,
      to_name: normalized,
      username: normalized,
      code,
      expires_minutes: 10,
    },
    { publicKey: EMAILJS_PUBLIC_KEY }
  );
}

export async function resetPasswordWithCode(
  username: string,
  code: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 4) {
    throw new Error('Le nouveau mot de passe doit faire au moins 4 caractères.');
  }

  const normalized = normalizeUsername(username);
  const request = readResetRequest();
  if (!request || request.username !== normalized) {
    throw new Error('Aucun code de récupération valide pour cet utilisateur.');
  }

  if (Date.now() > request.expiresAt) {
    localStorage.removeItem(RESET_REQUEST_KEY);
    throw new Error('Le code de récupération a expiré.');
  }

  if ((await hashCode(code.trim())) !== request.codeHash) {
    throw new Error('Code de récupération incorrect.');
  }

  const { changePasswordByUsername } = await import('./authService');
  await changePasswordByUsername(normalized, newPassword);
  localStorage.removeItem(RESET_REQUEST_KEY);
}
