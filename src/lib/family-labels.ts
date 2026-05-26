export function familyAdultLabel(gender?: string | null) {
  if (gender === 'FEMALE') return 'madre';
  if (gender === 'MALE') return 'padre';
  return 'adulto/a responsable';
}

export function otherFamilyAdultLabel(gender?: string | null) {
  if (gender === 'FEMALE') return 'otra madre';
  if (gender === 'MALE') return 'otro padre';
  return 'otro/a responsable';
}
