'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  initialQuery: string;
};

export default function ProfessorSearch({ initialQuery }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const navigateToQuery = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery) {
      params.set('q', trimmedQuery);
    } else {
      params.delete('q');
    }

    const nextSearch = params.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
      scroll: false,
    });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    navigateToQuery(nextQuery);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToQuery(query);
  };

  const clearSearch = () => {
    setQuery('');
    navigateToQuery('');
  };

  return (
    <form
      className="rounded-2xl border bg-card p-4 shadow-sm"
      onSubmit={handleSubmit}
    >
      <label className="space-y-1 text-sm">
        <span className="font-medium">Buscar</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            value={query}
            onChange={handleChange}
            placeholder="Nombre, apellido, actividad o mail"
            autoComplete="off"
            className="w-full rounded-md border bg-background py-2 pl-9 pr-11 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {query ? (
            <Button
              type="button"
              variant="ghost"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
              onClick={clearSearch}
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </label>
    </form>
  );
}
