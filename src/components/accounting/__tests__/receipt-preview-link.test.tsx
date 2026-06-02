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

  it('opens the receipt in a new browser tab', () => {
    act(() => {
      root.render(
        <ReceiptPreviewLink
          label="Factura junio"
          href="/api/accounting/movements/movement_1/receipt"
          title="Comprobante de egreso"
        />
      );
    });

    const link = container.querySelector<HTMLAnchorElement>('a');
    expect(link?.textContent).toContain('Factura junio');
    expect(link?.getAttribute('href')).toBe(
      '/api/accounting/movements/movement_1/receipt'
    );
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noreferrer');
    expect(link?.getAttribute('aria-label')).toBe('Comprobante de egreso');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('renders plain text when the receipt has no preview file', () => {
    act(() => {
      root.render(<ReceiptPreviewLink label="R-001" title="Comprobante" />);
    });

    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('R-001');
  });
});
