'use client';

import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from 'pdfjs-dist';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type DocumentaryBookViewerProps = {
  pdfUrl: string;
};

type PdfPageCanvasProps = {
  loadPage: (pageNumber: number) => Promise<PDFPageProxy>;
  pageNumber: number;
};

type PdfLoadState =
  | { status: 'loading'; pdf: null; pageCount: 0; error: null }
  | { status: 'ready'; pdf: PDFDocumentProxy; pageCount: number; error: null }
  | { status: 'error'; pdf: null; pageCount: 0; error: string };

type TurnDirection = 'next' | 'previous' | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function PdfPageCanvas({ loadPage, pageNumber }: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: {
      cancel?: () => void;
      promise: Promise<unknown>;
    } | null = null;

    setIsRendering(true);

    loadPage(pageNumber)
      .then((page) => {
        if (cancelled) {
          return;
        }

        const canvas = canvasRef.current;

        if (!canvas) {
          setIsRendering(false);
          return;
        }

        let context: CanvasRenderingContext2D | null = null;

        try {
          context = canvas.getContext('2d');
        } catch {
          context = null;
        }

        if (!context) {
          setIsRendering(false);
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

        renderTask.promise
          .then(() => {
            if (!cancelled) {
              setIsRendering(false);
            }
          })
          .catch(() => {
            if (!cancelled) {
              setIsRendering(false);
            }
          });
      })
      .catch(() => {
        if (!cancelled) {
          setIsRendering(false);
        }
      });

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [loadPage, pageNumber]);

  return (
    <div className="relative aspect-[595/842] w-full overflow-hidden rounded-md border bg-white shadow-inner">
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
  const pageCacheRef = useRef<Map<number, Promise<PDFPageProxy>>>(new Map());
  const [loadState, setLoadState] = useState<PdfLoadState>({
    status: 'loading',
    pdf: null,
    pageCount: 0,
    error: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [turnDirection, setTurnDirection] = useState<TurnDirection>(null);
  const [turnKey, setTurnKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loadedPdf: PDFDocumentProxy | null = null;
    const pageCache = pageCacheRef.current;
    const loadingTask = getDocument({
      url: pdfUrl,
      disableAutoFetch: true,
      disableRange: true,
      disableStream: true,
      withCredentials: false,
    });

    setCurrentPage(1);
    setTurnDirection(null);
    pageCache.clear();
    setLoadState({
      status: 'loading',
      pdf: null,
      pageCount: 0,
      error: null,
    });

    loadingTask.promise
      .then((pdf) => {
        if (cancelled) {
          pdf.destroy();
          return;
        }

        loadedPdf = pdf;
        setLoadState({
          status: 'ready',
          pdf,
          pageCount: pdf.numPages,
          error: null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState({
            status: 'error',
            pdf: null,
            pageCount: 0,
            error:
              'No pudimos cargar el PDF. Podés descargarlo desde el botón superior o volver a intentar más tarde.',
          });
        }
      });

    return () => {
      cancelled = true;
      pageCache.clear();
      loadingTask.destroy();
      loadedPdf?.destroy();
    };
  }, [pdfUrl]);

  const loadPage = useCallback(
    (pageNumber: number) => {
      if (loadState.status !== 'ready') {
        return Promise.reject(new Error('PDF no disponible'));
      }

      const cachedPage = pageCacheRef.current.get(pageNumber);

      if (cachedPage) {
        return cachedPage;
      }

      const pagePromise = loadState.pdf.getPage(pageNumber);
      pageCacheRef.current.set(pageNumber, pagePromise);
      return pagePromise;
    },
    [loadState]
  );

  useEffect(() => {
    if (loadState.status !== 'ready' || currentPage >= loadState.pageCount) {
      return;
    }

    loadPage(currentPage + 1).catch(() => {
      pageCacheRef.current.delete(currentPage + 1);
    });
  }, [currentPage, loadPage, loadState]);

  const progressLabel = useMemo(() => {
    if (loadState.status === 'loading') {
      return 'Cargando páginas';
    }

    if (loadState.status === 'error') {
      return 'PDF no disponible';
    }

    return `Página ${currentPage} de ${loadState.pageCount}`;
  }, [currentPage, loadState]);

  function goToPage(nextPage: number) {
    if (loadState.status !== 'ready') {
      return;
    }

    const boundedPage = clamp(nextPage, 1, loadState.pageCount);

    if (boundedPage === currentPage) {
      return;
    }

    setTurnDirection(boundedPage > currentPage ? 'next' : 'previous');
    setTurnKey((value) => value + 1);
    setCurrentPage(boundedPage);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToPage(currentPage + 1);
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPage(currentPage - 1);
    }
  }

  const canGoPrevious = loadState.status === 'ready' && currentPage > 1;
  const canGoNext =
    loadState.status === 'ready' && currentPage < loadState.pageCount;
  const pageAnimation =
    turnDirection === 'next'
      ? 'pageTurnNext 520ms ease both'
      : turnDirection === 'previous'
        ? 'pageTurnPrevious 520ms ease both'
        : undefined;

  return (
    <section
      className="rounded-2xl border bg-gradient-to-br from-stone-100 via-white to-emerald-50 p-4 shadow-sm sm:p-6"
      aria-label="Libro visual Pequeños habitantes de la tierra"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Libro visual
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">
            Recorré la historia página por página
          </h2>
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

      <div className="mx-auto max-w-[520px] [perspective:1400px]">
        {loadState.status === 'loading' ? (
          <div className="relative rounded-lg bg-white p-3 shadow-2xl">
            <div className="aspect-[595/842] animate-pulse rounded-md border bg-muted" />
          </div>
        ) : null}

        {loadState.status === 'ready' ? (
          <article
            key={`${currentPage}-${turnKey}`}
            className="relative rounded-lg bg-stone-100 p-3 shadow-2xl [transform-origin:left_center] [transform-style:preserve-3d]"
            style={{ animation: pageAnimation }}
            aria-label={`Página ${currentPage} de ${loadState.pageCount}`}
          >
            <span className="pointer-events-none absolute inset-y-4 left-3 z-10 w-5 rounded-full bg-gradient-to-r from-stone-900/20 to-transparent" />
            <span className="pointer-events-none absolute inset-y-3 right-3 z-10 w-8 rounded-r-md bg-gradient-to-l from-amber-200/35 to-transparent" />
            <PdfPageCanvas loadPage={loadPage} pageNumber={currentPage} />
            <button
              type="button"
              aria-label="Volver una página desde el lado izquierdo"
              disabled={!canGoPrevious}
              onClick={() => goToPage(currentPage - 1)}
              className="absolute inset-y-3 left-3 z-20 w-[calc(50%-0.75rem)] rounded-l-md bg-transparent transition hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-default disabled:hover:bg-transparent"
            />
            <button
              type="button"
              aria-label="Avanzar una página desde el lado derecho"
              disabled={!canGoNext}
              onClick={() => goToPage(currentPage + 1)}
              className="absolute inset-y-3 right-3 z-20 w-[calc(50%-0.75rem)] rounded-r-md bg-transparent transition hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-default disabled:hover:bg-transparent"
            />
          </article>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={!canGoPrevious}
          onClick={() => goToPage(currentPage - 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-card text-foreground shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="min-w-28 text-center text-sm font-semibold text-muted-foreground">
          {progressLabel}
        </span>
        <button
          type="button"
          aria-label="Página siguiente"
          disabled={!canGoNext}
          onClick={() => goToPage(currentPage + 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-card text-foreground shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
