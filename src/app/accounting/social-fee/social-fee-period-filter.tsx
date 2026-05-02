'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/select';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const YEARS = Array.from({ length: 2100 - 2020 + 1 }, (_, index) =>
  String(2020 + index)
);

export default function SocialFeePeriodFilter({
  initialMonth,
  initialYear,
}: {
  initialMonth: number;
  initialYear: number;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(String(initialMonth));
  const [year, setYear] = useState(String(initialYear));

  useEffect(() => {
    setMonth(String(initialMonth));
    setYear(String(initialYear));
  }, [initialMonth, initialYear]);

  const navigateToPeriod = (nextMonth: string, nextYear: string) => {
    const params = new URLSearchParams({
      month: nextMonth,
      year: nextYear,
    });

    router.replace(`/accounting/social-fee?${params.toString()}`, {
      scroll: false,
    });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span className="font-medium">Mes</span>
        <Select
          value={month}
          onValueChange={(value) => {
            setMonth(value);
            navigateToPeriod(value, year);
          }}
        >
          {MONTHS.map((label, index) => (
            <option key={label} value={String(index + 1)}>
              {label}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium">Año</span>
        <Select
          value={year}
          onValueChange={(value) => {
            setYear(value);
            navigateToPeriod(month, value);
          }}
        >
          {YEARS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
