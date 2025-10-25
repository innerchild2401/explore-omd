'use client';

import { useState } from 'react';
import type { Section } from '@/types';

interface SectionEditorProps {
  section: Section;
  onClose: () => void;
  onSave: () => void;
}

export default function SectionEditor({ section, onClose, onSave }: SectionEditorProps) {
  const [content, setContent] = useState(section.content);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement save to Supabase
    console.log('Saving section:', section.id, content);
    
    setTimeout(() => {
      setSaving(false);
      onSave();
    }, 1000);
  };

  const updateField = (key: string, value: any) => {
    setContent({ ...content, [key]: value });
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Edit Section</h2>
          <p className="mt-1 text-gray-600">
            {section.type} • ID: {section.id}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100"
        >
          ✕ Close
        </button>
      </div>

      <div className="space-y-6">
        {/* Title Field */}
        {section.type !== 'footer' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={content.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter section title"
            />
          </div>
        )}

        {/* Subtitle Field */}
        {['hero', 'stays', 'restaurants', 'experiences'].includes(section.type) && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subtitle
            </label>
            <textarea
              value={content.subtitle || ''}
              onChange={(e) => updateField('subtitle', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter section subtitle"
            />
          </div>
        )}

        {/* CTA Button */}
        {section.type === 'hero' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              CTA Button Text
            </label>
            <input
              type="text"
              value={content.cta || ''}
              onChange={(e) => updateField('cta', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., Explore Now"
            />
          </div>
        )}

        {/* Background Image */}
        {section.type === 'hero' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Background Image URL
            </label>
            <input
              type="text"
              value={content.backgroundImage || ''}
              onChange={(e) => updateField('backgroundImage', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="https://..."
            />
            {content.backgroundImage && (
              <img
                src={content.backgroundImage}
                alt="Preview"
                className="mt-2 h-32 w-full rounded-lg object-cover"
              />
            )}
          </div>
        )}

        {/* JSON Editor for Advanced Users */}
        <details className="rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer font-medium text-gray-700">
            Advanced: Edit Raw JSON
          </summary>
          <textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try {
                setContent(JSON.parse(e.target.value));
              } catch (err) {
                // Invalid JSON, ignore
              }
            }}
            rows={10}
            className="mt-4 w-full rounded-lg border border-gray-300 bg-gray-50 p-4 font-mono text-sm focus:border-blue-500 focus:outline-none"
          />
        </details>
      </div>

      {/* Save/Cancel Actions */}
      <div className="mt-8 flex justify-end space-x-4">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

