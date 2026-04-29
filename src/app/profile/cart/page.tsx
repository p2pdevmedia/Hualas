import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CartStatus from '../payments/cart-status';

export default async function ProfileCartPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Carrito</h1>
        <p className="text-sm text-muted-foreground">
          Revisá y gestioná tus actividades pendientes de pago.
        </p>
      </header>

      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <CartStatus />
      </section>
    </main>
  );
}
