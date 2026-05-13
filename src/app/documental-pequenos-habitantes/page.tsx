import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const documentaryPdfDriveFileId = '1xEVM3yeRTx1fCKqcqwGGn_pEFXWIBHIp';
const documentaryPdfDriveUrl = `https://drive.google.com/file/d/${documentaryPdfDriveFileId}/view?usp=sharing`;
const documentaryPdfEmbedUrl = `https://drive.google.com/file/d/${documentaryPdfDriveFileId}/preview`;

export default function DocumentaryPage() {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </Link>

        <section className="space-y-6">
          <div className="max-w-3xl space-y-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Documental del Club Hualas
            </p>
            <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl">
              Pequeños habitantes de la tierra
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              En esta página podés consultar el PDF con más información sobre el
              proyecto audiovisual, su mirada educativa y la propuesta para
              acercarnos a las pequeñas formas de vida que habitan el
              territorio.
            </p>
            <a
              href={documentaryPdfDriveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Abrir PDF en otra pestaña
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <iframe
              title="PDF de Pequeños habitantes de la tierra"
              src={documentaryPdfEmbedUrl}
              className="h-[75vh] min-h-[520px] w-full"
              loading="lazy"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
