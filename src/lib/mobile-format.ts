export function formatFullName(person?: {
  name?: string | null;
  lastName?: string | null;
}) {
  if (!person) return 'Sin nombre';
  return [person.name, person.lastName].filter(Boolean).join(' ').trim() || 'Sin nombre';
}

export function formatMobileDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatMobileDateOnly(value: Date | string | null | undefined) {
  const iso = formatMobileDate(value);
  return iso ? iso.slice(0, 10) : null;
}

export function getAgeFromBirthDate(birthDate: Date | null) {
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}
