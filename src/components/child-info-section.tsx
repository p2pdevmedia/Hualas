'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ChildInfoSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function ChildInfoSection({
  title,
  children,
  defaultOpen = true,
}: ChildInfoSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <h3 className="font-semibold text-sm">{title}</h3>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}
