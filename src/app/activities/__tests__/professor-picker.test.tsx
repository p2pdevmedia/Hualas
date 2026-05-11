import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ProfessorPicker from '../professor-picker';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const professors = [
  {
    id: 'professor-1',
    name: 'Ana',
    lastName: 'Lagos',
    email: 'ana@example.com',
  },
  {
    id: 'professor-2',
    name: 'Bruno',
    lastName: 'Mendez',
    email: 'bruno@example.com',
  },
];

describe('ProfessorPicker', () => {
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

  it('starts hidden when rendered as a collapsed toggle', () => {
    act(() => {
      root.render(
        <ProfessorPicker
          professors={professors}
          value={['professor-1']}
          onChange={jest.fn()}
          defaultCollapsed
        />
      );
    });

    const toggle = container.querySelector<HTMLButtonElement>(
      'button[aria-controls]'
    );

    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(
      0
    );

    act(() => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(
      professors.length
    );
  });
});
