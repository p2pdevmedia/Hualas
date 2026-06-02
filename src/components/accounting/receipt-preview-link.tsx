import { ReceiptText } from 'lucide-react';

type Props = {
  label: string;
  href?: string | null;
  title: string;
};

export default function ReceiptPreviewLink({ label, href, title }: Props) {
  if (!href) {
    return <span className="text-muted-foreground">{label}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={title}
      title={title}
      className="inline-flex items-center gap-1 text-link hover:underline"
    >
      <ReceiptText className="h-4 w-4" />
      {label}
    </a>
  );
}
