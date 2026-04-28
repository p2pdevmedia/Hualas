'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';

type User = {
  name: string | null;
  lastName: string | null;
  profilePhoto?: string | null;
  dni: string | null;
  birthDate: string | null;
  gender: string | null;
  address: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  email: string;
  phone: string | null;
  allergies: string | null;
  regularMedication: string | null;
  relevantDiseases: string | null;
  previousInjuries: string | null;
  physicalRestrictions: string | null;
  bloodGroup: string | null;
  primaryDoctor: string | null;
  doctorPhone: string | null;
};

export default function ProfileForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [dni, setDni] = useState(user.dni ?? '');
  const [birthDate, setBirthDate] = useState(user.birthDate ?? '');
  const [gender, setGender] = useState(user.gender ?? '');
  const [address, setAddress] = useState(user.address ?? '');
  const [nationality, setNationality] = useState(user.nationality ?? '');
  const [maritalStatus, setMaritalStatus] = useState(user.maritalStatus ?? '');
  const [allergies, setAllergies] = useState(user.allergies ?? '');
  const [regularMedication, setRegularMedication] = useState(user.regularMedication ?? '');
  const [relevantDiseases, setRelevantDiseases] = useState(user.relevantDiseases ?? '');
  const [previousInjuries, setPreviousInjuries] = useState(user.previousInjuries ?? '');
  const [physicalRestrictions, setPhysicalRestrictions] = useState(user.physicalRestrictions ?? '');
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup ?? '');
  const [primaryDoctor, setPrimaryDoctor] = useState(user.primaryDoctor ?? '');
  const [doctorPhone, setDoctorPhone] = useState(user.doctorPhone ?? '');
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          lastName,
          dni: dni || null,
          birthDate,
          gender: gender || undefined,
          address,
          nationality,
          maritalStatus,
          allergies,
          regularMedication,
          relevantDiseases,
          previousInjuries,
          physicalRestrictions,
          bloodGroup,
          primaryDoctor,
          doctorPhone,
          email,
          phone,
          ...(password ? { password } : {}),
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Perfil actualizado');
      setPassword('');
      setTimeout(() => router.refresh(), 1000);
    } catch (e) {
      setError('No se pudo actualizar el perfil');
    }
  }

  return (
    <Box asChild>
      <form onSubmit={submit} autoComplete="on">
        <Box className="space-y-3">
          <Flex gap="3" direction={{ initial: 'column', md: 'row' }}>
            <Input
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Flex>
          <Input
            placeholder="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <Select
            value={gender}
            onValueChange={setGender}
          >
            <SelectItem value="">Género</SelectItem>
            <SelectItem value="FEMALE">Femenino</SelectItem>
            <SelectItem value="MALE">Masculino</SelectItem>
            <SelectItem value="NON_BINARY">No Binario</SelectItem>
            <SelectItem value="UNDISCLOSED">Prefiero no decirlo</SelectItem>
            <SelectItem value="OTHER">Otro</SelectItem>
          </Select>
          <Input
            placeholder="Domicilio"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            placeholder="Nacionalidad"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
          />
          <Input
            placeholder="Estado Civil"
            value={maritalStatus}
            onChange={(e) => setMaritalStatus(e.target.value)}
          />

          {/* Medical Sheet */}
          <Box className="rounded-lg border bg-muted/20 p-4">
            <Box className="space-y-3">
              <Heading size="4">Ficha médica</Heading>
              <Textarea
                placeholder="Alergias"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
              <Textarea
                placeholder="Medicación habitual"
                value={regularMedication}
                onChange={(e) => setRegularMedication(e.target.value)}
              />
              <Textarea
                placeholder="Enfermedades relevantes"
                value={relevantDiseases}
                onChange={(e) => setRelevantDiseases(e.target.value)}
              />
              <Textarea
                placeholder="Lesiones previas"
                value={previousInjuries}
                onChange={(e) => setPreviousInjuries(e.target.value)}
              />
              <Textarea
                placeholder="Restricciones físicas"
                value={physicalRestrictions}
                onChange={(e) => setPhysicalRestrictions(e.target.value)}
              />
              <Input
                placeholder="Grupo sanguíneo"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
              />
              <Input
                placeholder="Médico de cabecera"
                value={primaryDoctor}
                onChange={(e) => setPrimaryDoctor(e.target.value)}
              />
              <Input
                placeholder="Teléfono médico"
                value={doctorPhone}
                onChange={(e) => setDoctorPhone(e.target.value)}
              />
            </Box>
          </Box>

          <Input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="profile-new-password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input type="hidden" name="username" value={user.email} />
          {error && <Text size="2" color="red">{error}</Text>}
          {success && <Text size="2" color="green">{success}</Text>}
          <Button type="submit" className="w-full">
            Guardar cambios
          </Button>
        </Box>
      </form>
    </Box>
  );
}
