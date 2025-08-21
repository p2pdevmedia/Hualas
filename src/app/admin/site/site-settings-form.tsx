'use client';

import { useState } from 'react';
import type { SiteSettings } from '@/types/site';

export default function SiteSettingsForm({
  settings,
}: {
  settings: SiteSettings | null;
}) {
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [navbarColor, setNavbarColor] = useState(
    settings?.navbarColor ?? '#1e293b'
  );
  const [footerColor, setFooterColor] = useState(
    settings?.footerColor ?? '#1e293b'
  );
  const [backgroundColor, setBackgroundColor] = useState(
    settings?.backgroundColor ?? '#ffffff'
  );
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
    formData.append('navbarColor', navbarColor);
    formData.append('footerColor', footerColor);
    formData.append('backgroundColor', backgroundColor);
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
          accept="image/x-icon"
          onChange={(e) => handleFileChange(e, setFavicon)}
        />
      </div>
      <div>
        <label className="block mb-1">Navbar Color</label>
        <input
          type="color"
          value={navbarColor}
          onChange={(e) => setNavbarColor(e.target.value)}
        />
      </div>
      <div>
        <label className="block mb-1">Footer Color</label>
        <input
          type="color"
          value={footerColor}
          onChange={(e) => setFooterColor(e.target.value)}
        />
      </div>
      <div>
        <label className="block mb-1">Background Color</label>
        <input
          type="color"
          value={backgroundColor}
          onChange={(e) => setBackgroundColor(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Save
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
