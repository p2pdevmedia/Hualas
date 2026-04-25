'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SiteSettingsForm() {
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: File | null) => void
  ) => {
    const file = e.target.files?.[0] ?? null;
    setter(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    if (logo) formData.append('logo', logo);
    if (favicon) formData.append('favicon', favicon);
    const res = await fetch('/api/site-settings', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      setMessage('Settings saved.');
    } else {
      setMessage('Error saving settings.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1">Navbar Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, setLogo)}
        />
      </div>
      <div>
        <label className="block mb-1">Favicon (.ico)</label>
        <input
          type="file"
          accept="image/x-icon,image/png"
          onChange={(e) => handleFileChange(e, setFavicon)}
        />
      </div>
      <Button type="submit">Guardar configuración</Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </form>
  );
}
