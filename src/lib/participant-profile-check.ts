export type ProfileCheckResult = {
  valid: boolean;
  missingFields: string[];
};

type UserFields = {
  name: string | null;
  lastName: string | null;
  dni: string | null;
  birthDate: Date | null;
  address: string | null;
  phone: string | null;
};

type ChildFields = {
  name: string;
  lastName: string | null;
  documentNumber: string | null;
  birthDate: Date | null;
  address: string | null;
};

export function checkUserProfile(user: UserFields): ProfileCheckResult {
  const missing: string[] = [];
  if (!user.name?.trim()) missing.push('nombre');
  if (!user.lastName?.trim()) missing.push('apellido');
  if (!user.dni?.trim()) missing.push('DNI');
  if (!user.birthDate) missing.push('fecha de nacimiento');
  if (!user.address?.trim()) missing.push('dirección');
  if (!user.phone?.trim()) missing.push('teléfono');
  return { valid: missing.length === 0, missingFields: missing };
}

export function checkChildProfile(
  child: ChildFields,
  parentPhone: string | null
): ProfileCheckResult {
  const missing: string[] = [];
  if (!child.name?.trim()) missing.push('nombre del menor');
  if (!child.lastName?.trim()) missing.push('apellido del menor');
  if (!child.documentNumber?.trim()) missing.push('DNI del menor');
  if (!child.birthDate) missing.push('fecha de nacimiento del menor');
  if (!child.address?.trim()) missing.push('dirección del menor');
  if (!parentPhone?.trim()) missing.push('tu teléfono');
  return { valid: missing.length === 0, missingFields: missing };
}
