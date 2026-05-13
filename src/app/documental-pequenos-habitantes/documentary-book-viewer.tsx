'use client';

import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import {
  UIEvent,
  WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const pageGap = 28;
const pageWidth = 360;

type DocumentaryBookViewerProps = {
  pdfUrl: string;
};

type PdfPageCanvasProps = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
};

type PdfLoadState =
  | { status: 'loading'; pdf: null; pageNumbers: number[]; error: null }
  | {
      status: 'ready';
      pdf: PDFDocumentProxy;
      pageNumbers: number[];
      error: null;
    }
  | { status: 'error'; pdf: null; pageNumbers: number[]; error: string };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function PdfPageCanvas({ pdf, pageNumber }: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<
      Awaited<ReturnType<typeof pdf.getPage>>['render']
    > | null = null;

    setIsRendering(true);

    pdf.getPage(pageNumber).then((page) => {
      if (cancelled) {
        return;
      }

      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');

      if (!canvas || !context) {
        return;
      }

      const viewport = page.getViewport({ scale: 1.9 });
      const outputScale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);

      renderTask = page.render({
        canvasContext: context,
        transform:
          outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : undefined,
        viewport,
      });

      renderTask.promise.finally(() => {
        if (!cancelled) {
          setIsRendering(false);
        }
      });
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdf]);

  return (
    <div className="relative aspect-[595/842] w-full overflow-hidden rounded-r-xl rounded-l-sm border bg-white">
      {isRendering ? (
        <div className="absolute inset-0 grid place-items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cargando página
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        className="relative h-full w-full object-contain"
        aria-label={`Página ${pageNumber} del documental Pequeños habitantes de la tierra`}
      />
    </div>
  );
}

export function DocumentaryBookViewer({ pdfUrl }: DocumentaryBookViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<PdfLoadState>({
    status: 'loading',
    pdf: null,
    pageNumbers: [],
    error: null,
  });
  const [scrollState, setScrollState] = useState({
    left: 0,
    viewportWidth: 1,
    scrollWidth: 1,
  });

  useEffect(() => {
    let cancelled = false;
    const loadingTask = getDocument({
      url: pdfUrl,
      disableAutoFetch: true,
      disableRange: true,
      disableStream: true,
      withCredentials: false,
    });

    setLoadState({
      status: 'loading',
      pdf: null,
      pageNumbers: [],
      error: null,
    });

    loadingTask.promise
      .then((pdf) => {
        if (cancelled) {
          pdf.destroy();
          return;
        }

        setLoadState({
          status: 'ready',
          pdf,
          pageNumbers: Array.from(
            { length: pdf.numPages },
            (_, index) => index + 1
          ),
          error: null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState({
            status: 'error',
            pdf: null,
            pageNumbers: [],
            error:
              'No pudimos cargar el PDF desde Drive. Probá abrirlo desde el botón superior.',
          });
        }
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [pdfUrl]);

  const pageNumbers = loadState.pageNumbers;
  const progressLabel = useMemo(() => {
    if (loadState.status === 'loading') {
      return 'Cargando páginas';
    }

    if (pageNumbers.length === 0) {
      return 'Sin páginas disponibles';
    }

    const maxScroll = Math.max(
      scrollState.scrollWidth - scrollState.viewportWidth,
      1
    );
    const estimatedPage = clamp(
      Math.round((scrollState.left / maxScroll) * (pageNumbers.length - 1)) + 1,
      1,
      pageNumbers.length
    );

    return `Página ${estimatedPage} de ${pageNumbers.length}`;
  }, [
    loadState.status,
    pageNumbers.length,
    scrollState.left,
    scrollState.scrollWidth,
    scrollState.viewportWidth,
  ]);

  function updateScrollState(target: HTMLDivElement) {
    setScrollState({
      left: target.scrollLeft,
      viewportWidth: Math.max(target.clientWidth, 1),
      scrollWidth: Math.max(target.scrollWidth, 1),
    });
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    updateScrollState(event.currentTarget);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const target = scrollRef.current;

    if (!target || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return;
    }

    event.preventDefault();
    target.scrollBy({ left: event.deltaY, behavior: 'smooth' });
  }

  return (
    <section className="rounded-[2rem] border bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Libro visual
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold">
            Recorré las páginas del documental
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Deslizá hacia el costado —o usá la rueda del mouse— para pasar las
            hojas con un efecto de libro.
          </p>
        </div>
        <p className="text-sm font-semibold text-primary" aria-live="polite">
          {progressLabel}
        </p>
      </div>

      {loadState.status === 'error' ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {loadState.error}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="book-scroll -mx-4 flex min-h-[32rem] snap-x snap-mandatory gap-7 overflow-x-auto px-4 pb-8 pt-3 [perspective:1200px] sm:-mx-6 sm:px-6"
        onScroll={handleScroll}
        onWheel={handleWheel}
        aria-label="Páginas del documental Pequeños habitantes de la tierra"
      >
        {loadState.status === 'loading'
          ? Array.from({ length: 3 }, (_, index) => (
              <article
                key={index}
                className="relative w-[78vw] max-w-[360px] shrink-0 snap-center rounded-r-2xl rounded-l-md bg-white p-2 shadow-xl sm:w-[360px]"
              >
                <div className="aspect-[595/842] animate-pulse rounded-r-xl rounded-l-sm border bg-muted" />
                <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cargando
                </p>
              </article>
            ))
          : null}

        {loadState.status === 'ready'
          ? pageNumbers.map((pageNumber, index) => {
              const pageCenter = index * (pageWidth + pageGap) + pageWidth / 2;
              const viewportCenter =
                scrollState.left + scrollState.viewportWidth / 2;
              const distance =
                (pageCenter - viewportCenter) / scrollState.viewportWidth;
              const rotation = clamp(distance * -54, -42, 42);
              const lift = 1 - Math.min(Math.abs(distance) * 0.13, 0.18);
              const shadowStrength = 18 + Math.min(Math.abs(distance) * 34, 28);

              return (
                <article
                  key={pageNumber}
                  className="book-page relative w-[78vw] max-w-[360px] shrink-0 snap-center rounded-r-2xl rounded-l-md bg-white p-2 shadow-xl transition-transform duration-300 ease-out [transform-style:preserve-3d] sm:w-[360px]"
                  style={{
                    transform: `rotateY(${rotation}deg) scale(${lift})`,
                    transformOrigin:
                      rotation > 0 ? 'left center' : 'right center',
                    boxShadow: `0 ${shadowStrength}px ${shadowStrength + 18}px rgba(41, 37, 36, 0.22)`,
                  }}
                  aria-label={`Página ${pageNumber} de ${pageNumbers.length}`}
                >
                  <span className="pointer-events-none absolute inset-y-3 left-3 z-10 w-5 rounded-full bg-gradient-to-r from-stone-900/20 to-transparent" />
                  <span className="pointer-events-none absolute inset-y-2 right-2 z-10 w-8 rounded-r-2xl bg-gradient-to-l from-amber-200/35 to-transparent" />
                  <PdfPageCanvas pdf={loadState.pdf} pageNumber={pageNumber} />
                  <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Página {pageNumber}
                  </p>
                </article>
              );
            })
          : null}
      </div>
    </section>
  );
}
