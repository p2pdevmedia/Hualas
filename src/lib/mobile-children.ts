import { Prisma } from '@prisma/client';
import { formatMobileDateOnly } from '@/lib/mobile-format';

export const mobileChildSelect = {
  id: true,
  name: true,
  lastName: true,
  profilePhoto: true,
  documentType: true,
  documentNumber: true,
  documentFrontPhoto: true,
  documentBackPhoto: true,
  birthDate: true,
  address: true,
  gender: true,
  nationality: true,
  maritalStatus: true,
  allergies: true,
  regularMedication: true,
  relevantDiseases: true,
  previousInjuries: true,
  physicalRestrictions: true,
  bloodGroup: true,
  primaryDoctor: true,
  doctorPhone: true,
  doctorCertificate: true,
  observations: true,
} satisfies Prisma.ChildSelect;

export type MobileChildRecord = Prisma.ChildGetPayload<{
  select: typeof mobileChildSelect;
}>;

export function serializeMobileChild(child: MobileChildRecord) {
  return {
    id: child.id,
    name: child.name,
    lastName: child.lastName,
    profilePhoto: child.profilePhoto,
    documentType: child.documentType,
    documentNumber: child.documentNumber,
    documentFrontPhoto: child.documentFrontPhoto,
    documentBackPhoto: child.documentBackPhoto,
    birthDate: formatMobileDateOnly(child.birthDate),
    address: child.address,
    gender: child.gender,
    nationality: child.nationality,
    maritalStatus: child.maritalStatus,
    allergies: child.allergies,
    regularMedication: child.regularMedication,
    relevantDiseases: child.relevantDiseases,
    previousInjuries: child.previousInjuries,
    physicalRestrictions: child.physicalRestrictions,
    bloodGroup: child.bloodGroup,
    primaryDoctor: child.primaryDoctor,
    doctorPhone: child.doctorPhone,
    doctorCertificate: child.doctorCertificate,
    observations: child.observations,
  };
}
