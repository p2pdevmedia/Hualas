import { BillableConceptCode, PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const concepts = [
  { code: BillableConceptCode.SOCIAL_FEE, name: 'Cuota social' },
  { code: BillableConceptCode.ACTIVITY_FEE, name: 'Cuota de actividad' },
  { code: BillableConceptCode.REGISTRATION_FEE, name: 'Matrícula' },
  { code: BillableConceptCode.INSURANCE, name: 'Seguro' },
  { code: BillableConceptCode.DISCOUNT, name: 'Descuento familiar' },
  { code: BillableConceptCode.SURCHARGE, name: 'Recargo' },
  { code: BillableConceptCode.OTHER, name: 'Otro' },
];

async function main() {
  for (const concept of concepts) {
    await prisma.billableConcept.upsert({
      where: { code: concept.code },
      create: concept,
      update: { name: concept.name, active: true },
    });
  }
}

main().finally(() => prisma.$disconnect());
