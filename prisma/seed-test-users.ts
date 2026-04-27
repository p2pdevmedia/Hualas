import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await hash('Test1234!', 12);
  const memberPassword = await hash('Test1234!', 12);
  const professorPassword = await hash('Test1234!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { role: 'ADMIN', name: 'Admin Test', isActive: true },
    create: {
      email: 'admin@test.com',
      name: 'Admin Test',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@test.com' },
    update: { role: 'MEMBER', name: 'Member Test', isActive: true },
    create: {
      email: 'member@test.com',
      name: 'Member Test',
      password: memberPassword,
      role: 'MEMBER',
      isActive: true,
    },
  });

  const professor = await prisma.user.upsert({
    where: { email: 'professor@test.com' },
    update: { role: 'PROFESSOR', name: 'Professor Test', isActive: true },
    create: {
      email: 'professor@test.com',
      name: 'Professor Test',
      password: professorPassword,
      role: 'PROFESSOR',
      isActive: true,
    },
  });

  console.log('✅ Usuarios de prueba creados/actualizados:');
  console.log(`  Admin:  admin@test.com  / Test1234!  (id: ${admin.id})`);
  console.log(`  Member: member@test.com / Test1234!  (id: ${member.id})`);
  console.log(
    `  Professor: professor@test.com / Test1234!  (id: ${professor.id})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
