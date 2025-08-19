import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">Welcome to Club Hualas</h1>
      <Link href="/events/new">
        <Button className="mt-4">Crear evento</Button>
      </Link>
    </main>
  );
}
