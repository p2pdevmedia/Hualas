'use client';

import { useState } from 'react';

type Field = {
  label: string;
  type: string;
  options: string[];
};

export default function NewForm() {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Field[]>([]);

  const addField = () => {
    setFields([...fields, { label: '', type: 'text', options: [] }]);
  };

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, fields }),
    });
    setTitle('');
    setFields([]);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block mb-1">Title</label>
        <input
          className="border p-2 w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={i} className="border p-2">
            <input
              className="border p-1 w-full mb-1"
              placeholder="Label"
              value={f.label}
              onChange={(e) => updateField(i, 'label', e.target.value)}
            />
            <select
              className="border p-1 w-full mb-1"
              value={f.type}
              onChange={(e) => updateField(i, 'type', e.target.value)}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select</option>
            </select>
            {f.type === 'select' && (
              <div className="space-y-1">
                {f.options.map((opt, j) => (
                  <input
                    key={j}
                    className="border p-1 w-full"
                    placeholder={`Option ${j + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, j, e.target.value)}
                  />
                ))}
                <button
                  type="button"
                  className="text-sm text-blue-600"
                  onClick={() => addOption(i)}
                >
                  Add option
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addField}
        className="px-2 py-1 bg-gray-200"
      >
        Add field
      </button>
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white">
        Save Form
      </button>
    </form>
  );
}
