'use client';

import { useState } from 'react';
import type { Section } from '@/types';
import ImageUpload from './ImageUpload';
import { createClient } from '@/lib/supabase/client';

interface SectionEditorProps {
  section: Section;
  onClose: () => void;
  onSave: () => void;
}

export default function SectionEditor({ section, onClose, onSave }: SectionEditorProps) {
  const [content, setContent] = useState(section.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    try {
      const { error: updateError } = await supabase
        .from('sections')
        .update({ content })
        .eq('id', section.id);

      if (updateError) {
        throw updateError;
      }

      onSave(); // Refresh the sections list
    } catch (err: any) {
      console.error('Failed to save section:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: any) => {
    setContent({ ...content, [key]: value });
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg border border-gray-200">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Section</h2>
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
              Title {section.type === 'hero' ? '(2-6 words recommended)' : '(2-5 words recommended)'}
            </label>
            <input
              type="text"
              value={content.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              maxLength={section.type === 'hero' ? 60 : 50}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder={section.type === 'hero' ? 'e.g., Welcome to Constanta' : 'e.g., Where to Stay'}
            />
            <p className="mt-1 text-xs text-gray-500">
              {content.title?.length || 0}/{section.type === 'hero' ? 60 : 50} characters • Keep it short and impactful
            </p>
          </div>
        )}

        {/* Subtitle Field */}
        {['hero', 'stays', 'restaurants', 'experiences'].includes(section.type) && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subtitle {section.type === 'hero' ? '(1-2 sentences recommended)' : '(1 sentence recommended)'}
            </label>
            <textarea
              value={content.subtitle || ''}
              onChange={(e) => updateField('subtitle', e.target.value)}
              rows={3}
              maxLength={section.type === 'hero' ? 150 : 100}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder={section.type === 'hero' ? 'e.g., Discover amazing places and unforgettable experiences in our beautiful destination' : 'e.g., Find the perfect accommodation for your visit'}
            />
            <p className="mt-1 text-xs text-gray-500">
              {content.subtitle?.length || 0}/{section.type === 'hero' ? 150 : 100} characters • Clear and engaging description
            </p>
          </div>
        )}

        {/* CTA Button */}
        {section.type === 'hero' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              CTA Button Text (2-4 words recommended)
            </label>
            <input
              type="text"
              value={content.cta || ''}
              onChange={(e) => updateField('cta', e.target.value)}
              maxLength={30}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., Explore Now, Discover More, Start Exploring"
            />
            <p className="mt-1 text-xs text-gray-500">
              {content.cta?.length || 0}/30 characters • Action-oriented and concise
            </p>
          </div>
        )}

        {/* Background Media */}
        {section.type === 'hero' && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Background Image
              </label>
              <ImageUpload
                value={content.backgroundImage || ''}
                onChange={(url) => updateField('backgroundImage', url)}
                bucket="images"
                folder="hero"
                maxSizeMB={10}
                recommendedSize="1920×1080px (16:9 landscape)"
              />
              <p className="mt-2 text-xs text-gray-500">
                💡 <strong>Tips:</strong> Landscape orientation works best • High-quality images recommended
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Background Video (optional)
              </label>
              <input
                type="url"
                value={content.backgroundVideo || ''}
                onChange={(e) => updateField('backgroundVideo', e.target.value)}
                placeholder="https://your-bucket.supabase.co/storage/v1/object/public/hero/my-video.mp4"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Provide a public MP4/WebM URL (muted autoplay). Poster image falls back to the background image above.
              </p>
            </div>
          </>
        )}

        {/* Explore Section Fields */}
        {section.type === 'explore' && (
          <>
            {/* Description (longer welcome text) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Welcome Description (2-3 sentences recommended)
              </label>
              <textarea
                value={content.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                maxLength={400}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="Welcome to Constanta! From luxury hotels along the coast to hidden dining gems in the old town, from thrilling water sports to peaceful cultural experiences..."
              />
              <p className="mt-1 text-xs text-gray-500">
                {content.description?.length || 0}/400 characters • Paint a picture of your destination
              </p>
            </div>
          </>
        )}

        {/* Footer Fields */}
        {section.type === 'footer' && (
          <>
            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={content.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                maxLength={150}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="Your gateway to discovering amazing local experiences"
              />
              <p className="mt-1 text-xs text-gray-500">
                {content.description?.length || 0}/150 characters
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Quick Links (JSON Array)
              </label>
              <textarea
                value={JSON.stringify(content.links || [], null, 2)}
                onChange={(e) => {
                  try {
                    const links = JSON.parse(e.target.value);
                    updateField('links', links);
                  } catch (err) {
                    // Invalid JSON
                  }
                }}
                rows={8}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder={`[\n  { "text": "About Us", "url": "/about" },\n  { "text": "Contact", "url": "/contact" }\n]`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: [{'{'}&#34;text&#34;: &#34;Link Text&#34;, &#34;url&#34;: &#34;/path&#34;{'}'}]
              </p>
            </div>

            {/* Social Media */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Social Media Links
              </label>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Facebook URL</label>
                <input
                  type="url"
                  value={content.socials?.facebook || ''}
                  onChange={(e) => updateField('socials', { ...content.socials, facebook: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="https://facebook.com/your-page"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Instagram URL</label>
                <input
                  type="url"
                  value={content.socials?.instagram || ''}
                  onChange={(e) => updateField('socials', { ...content.socials, instagram: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="https://instagram.com/your-profile"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Twitter/X URL</label>
                <input
                  type="url"
                  value={content.socials?.twitter || ''}
                  onChange={(e) => updateField('socials', { ...content.socials, twitter: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="https://twitter.com/your-handle"
                />
              </div>
            </div>

            {/* Copyright */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Copyright Text
              </label>
              <input
                type="text"
                value={content.copyright || ''}
                onChange={(e) => updateField('copyright', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder={`© ${new Date().getFullYear()} Your Organization. All rights reserved.`}
              />
            </div>
          </>
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
            className="mt-4 w-full rounded-lg border border-gray-300 bg-gray-50 p-4 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </details>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
          <strong>Error:</strong> {error}
        </div>
      )}

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

