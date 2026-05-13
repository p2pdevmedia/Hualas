import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const documentaryDriveFileId = '1xEVM3yeRTx1fCKqcqwGGn_pEFXWIBHIp';
const documentaryDriveUrl = `https://drive.google.com/file/d/${documentaryDriveFileId}/view?usp=sharing`;
const documentaryDriveEmbedUrl = `https://drive.google.com/file/d/${documentaryDriveFileId}/preview`;
const documentaryThumbnailUrl = `https://drive.google.com/thumbnail?id=${documentaryDriveFileId}`;

function documentaryPhotoStyle(size: number, gradient: string) {
  return {
    backgroundImage: `${gradient}, url('${documentaryThumbnailUrl}&sz=w${size}')`,
  };
}

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

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Documental del Club Hualas
            </p>
            <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl">
              Pequeños habitantes de la tierra
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Un proyecto audiovisual para acercarnos a las pequeñas formas de
              vida que habitan el territorio y para celebrar la curiosidad de
              las infancias en contacto con la naturaleza.
            </p>
            <a
              href={documentaryDriveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Ver trailer en Drive
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <div className="overflow-hidden rounded-xl border bg-black shadow-sm">
            <iframe
              title="Trailer de Pequeños habitantes de la tierra"
              src={documentaryDriveEmbedUrl}
              className="aspect-video w-full"
              allow="autoplay; fullscreen"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Naturaleza
            </p>
            <h2 className="mt-2 text-xl font-semibold">Mirar de cerca</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              El documental propone observar el ambiente desde los detalles: los
              seres pequeños, sus refugios y sus vínculos con el paisaje.
            </p>
          </article>
          <article className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Infancias
            </p>
            <h2 className="mt-2 text-xl font-semibold">Aprender explorando</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              La experiencia recupera la curiosidad, las preguntas y el asombro
              como motores para aprender en comunidad.
            </p>
          </article>
          <article className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Territorio
            </p>
            <h2 className="mt-2 text-xl font-semibold">Cuidar lo propio</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Una invitación a valorar la Patagonia que habitamos y a construir
              hábitos de cuidado desde el club.
            </p>
          </article>
        </section>

        <section className="rounded-xl border bg-muted/30 p-5 shadow-sm">
          <div
            className="grid gap-3 sm:grid-cols-3"
            aria-label="Fotos del documental"
          >
            <div
              className="h-40 rounded-lg border bg-cover bg-center"
              style={documentaryPhotoStyle(
                700,
                'linear-gradient(135deg, rgba(34,197,94,0.35), rgba(14,116,144,0.2))'
              )}
            />
            <div
              className="h-40 rounded-lg border bg-cover bg-center"
              style={documentaryPhotoStyle(
                900,
                'linear-gradient(135deg, rgba(245,158,11,0.28), rgba(22,101,52,0.2))'
              )}
            />
            <div
              className="h-40 rounded-lg border bg-cover bg-center"
              style={documentaryPhotoStyle(
                1100,
                'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(132,204,22,0.22))'
              )}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
