export function normalizePhone(value: string): string {
  let digits = value.replace(/[^0-9]/g, '');
  if (/^0[67][0-9]{8}$/.test(digits)) digits = '212' + digits.slice(1);
  if (!/^[1-9][0-9]{7,14}$/.test(digits)) throw new Error('Numéro de téléphone invalide.');
  return '+' + digits;
}
