import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { DocumentaryBookViewer } from './documentary-book-viewer';

const documentaryPdfUrl = '/documentos/pequenos-habitantes-de-la-tierra.pdf';

export const metadata = {
  title: 'Pequeños habitantes de la tierra | Hualas',
  description:
    'Lectura visual del documental Pequeños habitantes de la tierra del Club Hualas.',
};

export default function HabitantesDeLaTierraPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-amber-50 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </Link>

        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Historia visual
            </p>
            <h1 className="mt-2 font-heading text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Pequeños habitantes de la tierra
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              Una invitación del Club Hualas para mirar de cerca las pequeñas
              formas de vida del territorio y recorrerlas como un libro.
            </p>
          </div>

          <a
            href={documentaryPdfUrl}
            download
            className="inline-flex w-fit items-center gap-2 rounded-md border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar PDF
          </a>
        </header>

        <DocumentaryBookViewer pdfUrl={documentaryPdfUrl} />
      </div>
    </main>
  );
}
