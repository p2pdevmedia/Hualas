import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ProfessorSearch from '../professor-search';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const replaceMock = jest.fn();
let currentSearchParams = new URLSearchParams();
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value'
)?.set;

jest.mock('next/navigation', () => ({
  usePathname: () => '/accounting/professors',
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => currentSearchParams,
}));

describe('ProfessorSearch', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    replaceMock.mockClear();
    currentSearchParams = new URLSearchParams('status=active');
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('updates the professor search URL as each letter is typed', () => {
    act(() => {
      root.render(<ProfessorSearch initialQuery="" />);
    });

    const input = container.querySelector<HTMLInputElement>('input[name="q"]');
    expect(input).not.toBeNull();

    act(() => {
      nativeInputValueSetter?.call(input, 'r');
      input!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(replaceMock).toHaveBeenLastCalledWith(
      '/accounting/professors?status=active&q=r',
      { scroll: false }
    );

    act(() => {
      nativeInputValueSetter?.call(input, 'ra');
      input!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(replaceMock).toHaveBeenLastCalledWith(
      '/accounting/professors?status=active&q=ra',
      { scroll: false }
    );
  });

  it('removes q from the URL when the search is cleared', () => {
    currentSearchParams = new URLSearchParams('q=ramos&status=active');

    act(() => {
      root.render(<ProfessorSearch initialQuery="ramos" />);
    });

    const clearButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Limpiar búsqueda"]'
    );
    expect(clearButton).not.toBeNull();

    act(() => {
      clearButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(replaceMock).toHaveBeenLastCalledWith(
      '/accounting/professors?status=active',
      { scroll: false }
    );
  });
});
