'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/components/language-provider';

interface Form {
  id: string;
  title: string;
  responseCount: number;
}

export default function FormList({ forms }: { forms: Form[] }) {
  const router = useRouter();
  const t = useTranslation().actions;

  const handleDelete = async (id: string) => {
    await fetch(`/api/forms/${id}`, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="text-left p-2 border-b">Title</th>
          <th className="text-left p-2 border-b">Responses</th>
          <th className="text-left p-2 border-b">Actions</th>
        </tr>
      </thead>
      <tbody>
        {forms.map((f) => (
          <tr key={f.id}>
            <td className="p-2 border-b">{f.title}</td>
            <td className="p-2 border-b">{f.responseCount}</td>
            <td className="p-2 border-b space-x-2">
              <Link href={`/admin/forms/${f.id}`} className="text-blue-600">
                {t.view}
              </Link>
              <Link
                href={`/admin/forms/${f.id}/edit`}
                className="text-blue-600"
              >
                {t.edit}
              </Link>
              <Link
                href={`/forms/${f.id}`}
                className="text-blue-600"
                target="_blank"
              >
                Public
              </Link>
              <button
                onClick={() => handleDelete(f.id)}
                className="text-red-600"
              >
                {t.delete}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
