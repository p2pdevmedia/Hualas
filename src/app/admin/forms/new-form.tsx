'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

type Field = {
  label: string;
  type: string;
  options: string[];
  required: boolean;
};

export default function NewForm() {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  const addField = () =>
    setFields([
      ...fields,
      { label: '', type: 'text', options: [], required: false },
    ]);

  const updateField = (index: number, key: keyof Field, value: any) => {
    const newFields = [...fields];
    (newFields[index] as any)[key] = value;
    setFields(newFields);
  };

  const addOption = (index: number) => {
    const newFields = [...fields];
    newFields[index].options.push('');
    setFields(newFields);
  };

  const updateOption = (
    fieldIndex: number,
    optIndex: number,
    value: string
  ) => {
    const newFields = [...fields];
    newFields[fieldIndex].options[optIndex] = value;
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, fields }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Formulario guardado');
      setTitle('');
      setFields([]);
    } catch (e) {
      setError('No se pudo guardar el formulario');
    }
  };

  return (
    <Form onSubmit={submit} className="space-y-5">
      <div className="space-y-1">
        <label className="text-sm font-medium">Título del formulario</label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Ficha de inscripción"
          required
        />
      </div>

      <div className="space-y-3">
        {fields.map((f, i) => (
          <div key={i} className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Campo {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeField(i)}
                className="text-xs text-destructive hover:text-destructive/80"
              >
                Eliminar
              </button>
            </div>
            <input
              className={inputClass}
              placeholder="Etiqueta del campo"
              value={f.label}
              onChange={(e) => updateField(i, 'label', e.target.value)}
            />
            <select
              className={inputClass}
              value={f.type}
              onChange={(e) => updateField(i, 'type', e.target.value)}
            >
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="select">Selección</option>
            </select>
            <label className="text-sm flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                className="accent-primary"
                checked={f.required}
                onChange={(e) => updateField(i, 'required', e.target.checked)}
              />
              Requerido
            </label>
            {f.type === 'select' && (
              <div className="space-y-2 pl-1">
                {f.options.map((opt, j) => (
                  <input
                    key={j}
                    className={inputClass}
                    placeholder={`Opción ${j + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, j, e.target.value)}
                  />
                ))}
                <button
                  type="button"
                  className="text-sm text-link hover:text-link/80"
                  onClick={() => addOption(i)}
                >
                  + Agregar opción
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addField}
        className="w-full rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        + Agregar campo
      </button>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Guardar formulario
      </Button>
    </Form>
  );
}
