import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { getDocument } from 'pdfjs-dist';
import { DocumentaryBookViewer } from '../documentary-book-viewer';

type MockPdf = {
  numPages: number;
  destroy: jest.Mock;
  getPage: jest.Mock;
};

const mockRender = jest.fn(() => ({ promise: Promise.resolve() }));
const mockGetDocument = getDocument as jest.Mock;

let mockPdf: MockPdf;
let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: jest.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createMockPdf(numPages = 3): MockPdf {
  return {
    numPages,
    destroy: jest.fn(),
    getPage: jest.fn((pageNumber: number) =>
      Promise.resolve({
        getViewport: jest.fn(() => ({ width: 595, height: 842 })),
        render: jest.fn(() => {
          mockRender(pageNumber);
          return { promise: Promise.resolve() };
        }),
      })
    ),
  };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('DocumentaryBookViewer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => ({}) as CanvasRenderingContext2D
    );
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockPdf = createMockPdf();
    mockRender.mockClear();
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(mockPdf),
      destroy: jest.fn(),
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.clearAllMocks();
  });

  it('opens on the first page and advances one page at a time', async () => {
    await act(async () => {
      root.render(
        <DocumentaryBookViewer pdfUrl="/documentos/pequenos-habitantes-de-la-tierra.pdf" />
      );
    });
    await flushPromises();

    expect(container.textContent).toContain('Página 1 de 3');
    expect(mockPdf.getPage).toHaveBeenCalledWith(1);
    expect(mockPdf.getPage).toHaveBeenCalledWith(2);

    const previousButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Página anterior"]'
    );
    const nextButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Página siguiente"]'
    );

    expect(previousButton?.disabled).toBe(true);
    expect(nextButton?.disabled).toBe(false);

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushPromises();

    expect(container.textContent).toContain('Página 2 de 3');
    expect(mockPdf.getPage).toHaveBeenCalledWith(3);
    expect(previousButton?.disabled).toBe(false);

    await act(async () => {
      previousButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushPromises();

    expect(container.textContent).toContain('Página 1 de 3');
    expect(mockPdf.getPage).toHaveBeenCalledWith(1);
  });

  it('uses page halves for next and previous navigation', async () => {
    await act(async () => {
      root.render(
        <DocumentaryBookViewer pdfUrl="/documentos/pequenos-habitantes-de-la-tierra.pdf" />
      );
    });
    await flushPromises();

    const nextPageArea = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Avanzar una página desde el lado derecho"]'
    );

    expect(nextPageArea).not.toBeNull();

    await act(async () => {
      nextPageArea?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushPromises();

    expect(container.textContent).toContain('Página 2 de 3');

    const previousPageArea = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Volver una página desde el lado izquierdo"]'
    );

    expect(previousPageArea).not.toBeNull();

    await act(async () => {
      previousPageArea?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });
    await flushPromises();

    expect(container.textContent).toContain('Página 1 de 3');
  });

  it('shows a local PDF error without pointing visitors to Drive', async () => {
    mockGetDocument.mockReturnValueOnce({
      promise: Promise.reject(new Error('missing local file')),
      destroy: jest.fn(),
    });

    await act(async () => {
      root.render(
        <DocumentaryBookViewer pdfUrl="/documentos/pequenos-habitantes-de-la-tierra.pdf" />
      );
    });
    await flushPromises();

    expect(container.textContent).toContain('No pudimos cargar el PDF');
    expect(container.textContent).not.toContain('Drive');
  });
});
