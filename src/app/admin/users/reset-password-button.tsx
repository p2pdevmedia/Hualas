'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/language-provider';
import { PasswordResetDialog } from './password-reset-dialog';

export default function ResetPasswordButton({ id }: { id: string }) {
  const t = useTranslation().actions;

  return (
    <PasswordResetDialog
      userId={id}
      trigger={<Button variant="secondary">{t.resetPassword}</Button>}
    />
  );
}
