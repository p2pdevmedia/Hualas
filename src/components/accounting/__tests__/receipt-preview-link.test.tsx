import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ReceiptPreviewLink from '../receipt-preview-link';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ReceiptPreviewLink', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('opens the receipt inside a modal preview', () => {
    act(() => {
      root.render(
        <ReceiptPreviewLink
          label="Factura junio"
          href="/api/accounting/movements/movement_1/receipt"
          title="Comprobante de egreso"
        />
      );
    });

    const button = container.querySelector<HTMLButtonElement>('button');
    expect(button?.textContent).toContain('Factura junio');

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const dialog = container.querySelector('[role="dialog"]');
    const iframe = container.querySelector<HTMLIFrameElement>('iframe');
    const externalLink =
      container.querySelector<HTMLAnchorElement>('a[target="_blank"]');

    expect(dialog).not.toBeNull();
    expect(iframe?.getAttribute('src')).toBe(
      '/api/accounting/movements/movement_1/receipt'
    );
    expect(iframe?.getAttribute('title')).toBe('Comprobante de egreso');
    expect(externalLink?.getAttribute('href')).toBe(
      '/api/accounting/movements/movement_1/receipt'
    );
  });

  it('renders plain text when the receipt has no preview file', () => {
    act(() => {
      root.render(<ReceiptPreviewLink label="R-001" title="Comprobante" />);
    });

    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).toContain('R-001');
  });
});
