import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ProfessorInvoicesPanel from '../professor-invoices-panel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const refreshMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe('ProfessorInvoicesPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    refreshMock.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  it('lets professors choose gallery images or PDF files for invoices', () => {
    act(() => {
      root.render(
        <ProfessorInvoicesPanel
          professorId="professor_1"
          initialInvoices={[]}
          activityOptions={[{ id: 'activity_1', name: 'Escalada adultos' }]}
          canUpload
        />
      );
    });

    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');

    expect(input).not.toBeNull();
    expect(input?.getAttribute('accept')).toBe('application/pdf,image/*');
    expect(input?.hasAttribute('capture')).toBe(false);
  });
});
