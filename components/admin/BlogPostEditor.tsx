'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { BlogPost, ContentBlock } from '@/types';
import ImageUpload from './ImageUpload';

interface BlogPostEditorProps {
  post?: BlogPost;
  authorId: string;
}

export default function BlogPostEditor({ post, authorId }: BlogPostEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [title, setTitle] = useState(post?.title || '');
  const [subtitle, setSubtitle] = useState(post?.subtitle || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [featuredImage, setFeaturedImage] = useState(post?.featured_image || '');
  const [featuredImageAlt, setFeaturedImageAlt] = useState(post?.featured_image_alt || '');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled' | 'archived'>(post?.status || 'draft');
  const [scheduledFor, setScheduledFor] = useState(post?.scheduled_for || '');
  const [metaTitle, setMetaTitle] = useState(post?.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(post?.meta_description || '');
  const [content, setContent] = useState<ContentBlock[]>(post?.content || [{ type: 'paragraph', content: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Auto-generate slug from title
  useEffect(() => {
    if (!post && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  }, [title, post]);

  const saveDraft = useCallback(async () => {
    if (!title || !slug) return;

    try {
      const postData = {
        author_id: authorId,
        title,
        subtitle: subtitle || null,
        slug,
        excerpt: excerpt || null,
        featured_image: featuredImage || null,
        featured_image_alt: featuredImageAlt || null,
        content,
        status: 'draft',
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
      };

      if (post) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', post.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert(postData);
        
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('unsaved');
    }
  }, [title, subtitle, slug, excerpt, featuredImage, featuredImageAlt, content, metaTitle, metaDescription, post, authorId, supabase]);

  // Auto-save draft every 5 seconds
  useEffect(() => {
    if (!post || status !== 'draft') return;
    
    const timer = setTimeout(async () => {
      if (title && slug) {
        setAutoSaveStatus('saving');
        await saveDraft();
        setAutoSaveStatus('saved');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [title, subtitle, slug, excerpt, content, featuredImage, status, post, saveDraft]);


  const handleSave = async () => {
    if (!title || !slug) {
      setError('Title and slug are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const postData: any = {
        author_id: authorId,
        title,
        subtitle: subtitle || null,
        slug,
        excerpt: excerpt || null,
        featured_image: featuredImage || null,
        featured_image_alt: featuredImageAlt || null,
        content,
        status,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
      };

      if (status === 'published') {
        postData.published_at = new Date().toISOString();
      } else if (status === 'scheduled' && scheduledFor) {
        postData.scheduled_for = scheduledFor;
      }

      if (post) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', post.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('blog_posts')
          .insert(postData)
          .select()
          .single();
        
        if (error) throw error;
        router.push(`/admin/blog/${data.id}/edit`);
        return;
      }

      router.push('/admin/blog');
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = 
      type === 'paragraph' ? { type: 'paragraph', content: '' } :
      type === 'heading' ? { type: 'heading', level: 2, content: '' } :
      type === 'image' ? { type: 'image', url: '', alt: '', width: 'content' } :
      type === 'quote' ? { type: 'quote', content: '' } :
      type === 'list' ? { type: 'list', style: 'unordered', items: [''] } :
      type === 'divider' ? { type: 'divider' } :
      { type: 'paragraph', content: '' };
    
    setContent([...content, newBlock]);
  };

  const updateBlock = (index: number, block: ContentBlock) => {
    const newContent = [...content];
    newContent[index] = block;
    setContent(newContent);
  };

  const deleteBlock = (index: number) => {
    if (content.length === 1) return; // Keep at least one block
    const newContent = content.filter((_, i) => i !== index);
    setContent(newContent);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full text-5xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Subtitle */}
          <div>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Subtitle (optional)"
              className="w-full text-2xl font-normal text-gray-600 bg-transparent border-none outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Content Blocks */}
          <div className="space-y-4">
            {content.map((block, index) => (
              <div key={index} className="group relative">
                {block.type === 'paragraph' && (
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(index, { ...block, content: e.target.value })}
                    placeholder="Start writing..."
                    className="w-full text-lg leading-relaxed text-gray-900 outline-none min-h-[100px] py-2 resize-none"
                    rows={Math.max(3, block.content.split('\n').length)}
                  />
                )}
                {block.type === 'heading' && (
                  <input
                    type="text"
                    value={block.content}
                    onChange={(e) => updateBlock(index, { ...block, content: e.target.value })}
                    placeholder={`Heading ${block.level}`}
                    className={`w-full font-bold text-gray-900 outline-none ${
                      block.level === 1 ? 'text-4xl' : block.level === 2 ? 'text-3xl' : 'text-2xl'
                    }`}
                  />
                )}
                {block.type === 'image' && (
                  <div className="space-y-2">
                    <ImageUpload
                      value={block.url}
                      onChange={(url) => updateBlock(index, { ...block, url })}
                      bucket="images"
                      folder="blog"
                    />
                    <input
                      type="text"
                      value={block.alt}
                      onChange={(e) => updateBlock(index, { ...block, alt: e.target.value })}
                      placeholder="Alt text"
                      className="w-full text-sm text-gray-600 border border-gray-300 rounded px-2 py-1"
                    />
                  </div>
                )}
                {block.type === 'quote' && (
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(index, { ...block, content: e.target.value })}
                    placeholder="Quote text"
                    className="w-full text-xl leading-relaxed text-gray-700 italic border-l-4 border-blue-600 pl-6 py-4 bg-blue-50 rounded-r-lg"
                    rows={3}
                  />
                )}
                {block.type === 'list' && (
                  <div className="space-y-2">
                    {block.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex gap-2">
                        <span className="text-blue-600 font-bold">
                          {block.style === 'ordered' ? `${itemIndex + 1}.` : '•'}
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const newItems = [...block.items];
                            newItems[itemIndex] = e.target.value;
                            updateBlock(index, { ...block, items: newItems });
                          }}
                          placeholder="List item"
                          className="flex-1 text-lg text-gray-900 outline-none"
                        />
                        <button
                          onClick={() => {
                            const newItems = block.items.filter((_, i) => i !== itemIndex);
                            updateBlock(index, { ...block, items: newItems.length > 0 ? newItems : [''] });
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        updateBlock(index, { ...block, items: [...block.items, ''] });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add item
                    </button>
                  </div>
                )}
                {block.type === 'divider' && (
                  <hr className="my-8 border-t border-gray-300" />
                )}
                
                {/* Block Actions */}
                <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => deleteBlock(index)}
                    className="text-red-500 hover:text-red-700 p-2"
                    disabled={content.length === 1}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            {/* Add Block Menu */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => addBlock('paragraph')}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                + Paragraph
              </button>
              <button
                onClick={() => addBlock('heading')}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                + Heading
              </button>
              <button
                onClick={() => addBlock('image')}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                + Image
              </button>
              <button
                onClick={() => addBlock('quote')}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                + Quote
              </button>
              <button
                onClick={() => addBlock('list')}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                + List
              </button>
              <button
                onClick={() => addBlock('divider')}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                + Divider
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Save Status */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-sm text-gray-600">
              Status: {autoSaveStatus === 'saving' ? 'Saving...' : autoSaveStatus === 'saved' ? 'Saved' : 'Unsaved changes'}
            </div>
          </div>

          {/* Publish Settings */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-4 font-semibold text-gray-900">Publish</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              {status === 'scheduled' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Schedule For
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Featured Image */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-4 font-semibold text-gray-900">Featured Image</h3>
            <ImageUpload
              value={featuredImage}
              onChange={setFeaturedImage}
              bucket="images"
              folder="blog"
            />
            <input
              type="text"
              value={featuredImageAlt}
              onChange={(e) => setFeaturedImageAlt(e.target.value)}
              placeholder="Alt text"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* SEO */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-4 font-semibold text-gray-900">SEO</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title || 'Meta title'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Meta Description
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder={excerpt || 'Meta description'}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-slug"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Excerpt
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief description..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

