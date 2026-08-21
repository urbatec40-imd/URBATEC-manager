const RECOVERY_EMAILS_KEY = 'uratec_recovery_emails';
const RESET_ENDPOINT = (import.meta.env.VITE_PASSWORD_RESET_ENDPOINT as string | undefined)?.trim() || '';

function readEmails(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(RECOVERY_EMAILS_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function getRecoveryEmail(username: string): string {
  return readEmails()[username.trim().toLowerCase()] || '';
}

export function setRecoveryEmail(username: string, email: string): void {
  const key = username.trim().toLowerCase();
  const value = email.trim().toLowerCase();
  if (!key) throw new Error('Utilisateur invalide');
  if (value && !/^\S+@\S+\.\S+$/.test(value)) throw new Error('Adresse Email invalide');
  const values = readEmails();
  if (value) values[key] = value;
  else delete values[key];
  localStorage.setItem(RECOVERY_EMAILS_KEY, JSON.stringify(values));
}

export async function requestPasswordReset(username: string): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Une connexion Internet est nécessaire pour récupérer le mot de passe.');
  }
  if (!RESET_ENDPOINT) {
    throw new Error('Le service de récupération Email n’est pas encore configuré.');
  }

  const normalized = username.trim().toLowerCase();
  const email = getRecoveryEmail(normalized);
  if (!email) {
    throw new Error('Aucune adresse Email de récupération n’est enregistrée pour cet utilisateur.');
  }

  const response = await fetch(RESET_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: normalized, email }),
  });

  if (!response.ok) {
    throw new Error('Impossible d’envoyer le code de récupération.');
  }
}
