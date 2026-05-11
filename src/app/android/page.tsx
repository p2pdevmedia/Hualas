import Link from 'next/link';
import { Download, ShieldCheck, Smartphone } from 'lucide-react';

const apkPath = '/downloads/hualas-mobile.apk';

export const metadata = {
  title: 'App Android | Hualas Club',
  description: 'Descargá la app Android de Hualas Club.',
};

export default function AndroidDownloadPage() {
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-primary">
              Hualas mobile
            </p>
            <h1 className="font-heading text-3xl font-semibold">App Android</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Instalá la versión de prueba para socios y profesores. La app se
              conecta a hualas.vercel.app.
            </p>
          </div>
          <a
            href={apkPath}
            download
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar APK
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <Smartphone className="mb-3 h-5 w-5 text-primary" aria-hidden />
            <h2 className="font-heading text-base font-semibold">
              Instalación manual
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Android puede pedir permiso para instalar apps descargadas desde
              el navegador.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <ShieldCheck className="mb-3 h-5 w-5 text-primary" aria-hidden />
            <h2 className="font-heading text-base font-semibold">
              Versión de prueba
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Este APK es un build debug para validación interna del club.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <Download className="mb-3 h-5 w-5 text-primary" aria-hidden />
            <h2 className="font-heading text-base font-semibold">
              Enlace directo
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Si el botón no inicia la descarga, abrí el archivo directo.
            </p>
            <a
              href={apkPath}
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              /downloads/hualas-mobile.apk
            </a>
          </div>
        </div>

        <div className="mt-8 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Después de instalarla, iniciá sesión con tu usuario de Hualas. Si
          Android bloquea la instalación, habilitá el permiso para instalar apps
          desconocidas desde el navegador que estés usando.
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="text-sm font-medium text-primary hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
