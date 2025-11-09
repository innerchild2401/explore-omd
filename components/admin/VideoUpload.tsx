'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface VideoUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

const DEFAULT_TYPES = ['video/mp4', 'video/webm'];

export default function VideoUpload({
  value,
  onChange,
  bucket = 'hero-media',
  folder = 'hero/videos',
  maxSizeMB = 60,
  acceptedTypes = DEFAULT_TYPES,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const supabase = createClient();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setError('Please upload an MP4 or WebM video file.');
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`Video must be smaller than ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'mp4';
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(data.path);

      onChange(publicUrl);
    } catch (err: any) {
      setError(err.message ?? 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div className="space-y-3">
      {value && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <video
            src={value}
            className="h-48 w-full rounded-lg object-cover"
            muted
            loop
            playsInline
            controls
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-green-600">✓ Video ready to play</span>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-700"
            >
              Remove video
            </button>
          </div>
        </div>
      )}

      {!value && (
        <div>
          <label className="block">
            <div
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                uploading
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                  <p className="mt-3 font-medium text-blue-600">Uploading video…</p>
                </div>
              ) : (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  >
                    <path d="M15 10.5V6a4 4 0 00-8 0v4.5M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-gray-500">MP4 or WebM up to {maxSizeMB}MB</p>
                  <p className="mt-3 text-xs text-blue-600">
                    💡 Tip: Keep videos under 20s for fast loading. Ensure they are muted for autoplay.
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowUrlInput((prev) => !prev)}
              className="text-sm text-gray-600 underline hover:text-gray-900"
            >
              {showUrlInput ? 'Hide URL input' : 'Or paste direct video URL'}
            </button>
            {showUrlInput && (
              <div className="mt-2">
                <input
                  type="url"
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="https://your-bucket.supabase.co/.../hero-video.mp4"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
    </div>
  );
}


