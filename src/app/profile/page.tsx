import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Box, Container, Flex, Heading, Text } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import ProfileForm from './form';
import ProfilePhotoUpload from './profile-photo-upload';
import ChildrenManager from './children';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      name: true,
      lastName: true,
      profilePhoto: true,
      updatedAt: true,
      dni: true,
      birthDate: true,
      gender: true,
      address: true,
      phone: true,
      nationality: true,
      maritalStatus: true,
      email: true,
      allergies: true,
      regularMedication: true,
      relevantDiseases: true,
      previousInjuries: true,
      physicalRestrictions: true,
      bloodGroup: true,
      primaryDoctor: true,
      doctorPhone: true,
    },
  });
  if (!user) {
    redirect('/');
  }
  return (
    <Container size="3" px={{ initial: '4', sm: '4' }} py="8">
      <Box className="space-y-6">
        <Card>
          <Box p="6">
            <Flex
              gap="6"
              direction={{ initial: 'column', md: 'row' }}
              align={{ initial: 'stretch', md: 'center' }}
            >
              <Box>
                <ProfilePhotoUpload
                  hasPhoto={Boolean(user.profilePhoto)}
                  photoVersion={user.updatedAt.getTime()}
                  name={user.name}
                  lastName={user.lastName}
                />
              </Box>
              <Box className="space-y-2">
                <Heading size="7" weight="bold">
                  Mi perfil
                </Heading>
                <Text size="2" color="gray">
                  Actualizá tus datos y guardá una foto de perfil tomada con la
                  cámara o subida desde tu dispositivo.
                </Text>
              </Box>
            </Flex>
          </Box>
        </Card>
        <Card>
          <Box p="6">
            <ProfileForm
              user={{
                ...user,
                birthDate: user.birthDate
                  ? user.birthDate.toISOString().split('T')[0]
                  : null,
              }}
            />
          </Box>
        </Card>
        <ChildrenManager userAddress={user.address ?? ''} />
      </Box>
    </Container>
  );
}
