// Additional browser-side screening. Supabase's public Auth API remains independent.
export class PasswordSafetyError extends Error {
  constructor(code) { super(code); this.name = 'PasswordSafetyError'; this.code = code; }
}
export async function requireSafePassword(password, {request = fetch, cryptography = globalThis.crypto} = {}) {
  if (typeof password !== 'string' || password.length < 12) throw new PasswordSafetyError('too_short');
  if (password.length > 1024) throw new PasswordSafetyError('too_long');
  try {
    const digest = await cryptography.subtle.digest('SHA-1', new TextEncoder().encode(password));
    const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2,'0')).join('').toUpperCase();
    // Never send the password, the full hash, the suffix, an email or session credentials.
    // Only check on submit, never incrementally while the user types.
    const response = await request(`https://api.pwnedpasswords.com/range/${hash.slice(0,5)}`, {
      method:'GET', headers:{'Add-Padding':'true'}, credentials:'omit', cache:'no-store',
      referrerPolicy:'no-referrer', redirect:'error', signal:AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('provider');
    const body = await response.text();
    if (body.length > 2000000) throw new Error('provider');
    const lines = body.trim().split(/\r?\n/);
    if (!body.trim() || lines.some(line => !/^[A-F0-9]{35}:[0-9]+$/i.test(line))) throw new Error('provider');
    if (lines.some(line => { const [suffix,count] = line.split(':'); return suffix.toUpperCase() === hash.slice(5) && Number(count) > 0; })) throw new PasswordSafetyError('compromised');
  } catch (failure) {
    if (failure instanceof PasswordSafetyError) throw failure;
    // A failed check is never treated as a clean password.
    throw new PasswordSafetyError('unavailable');
  }
}
