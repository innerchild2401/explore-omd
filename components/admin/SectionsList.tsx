'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, Reorder } from 'framer-motion';
import type { Section } from '@/types';
import SectionEditor from './SectionEditor';
import { createClient } from '@/lib/supabase/client';
import { TEMPLATE_OPTIONS, TemplateName } from '@/lib/omdTemplates';

interface SectionsListProps {
  sections: Section[];
  omdId: string;
  omdName: string;
  initialTemplate: TemplateName;
  settings: Record<string, any>;
  canEditTemplate: boolean;
}

const ALLOWED_SECTION_TYPES = new Set(['hero', 'explore', 'stays', 'restaurants', 'experiences', 'footer']);

export default function SectionsList({
  sections: initialSections,
  omdId,
  omdName,
  initialTemplate,
  settings,
  canEditTemplate,
}: SectionsListProps) {
  const filteredInitialSections = useMemo(
    () => initialSections.filter((section) => ALLOWED_SECTION_TYPES.has(section.type)),
    [initialSections]
  );

  const [sections, setSections] = useState(filteredInitialSections);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<TemplateName>(initialTemplate);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setSections(filteredInitialSections);
  }, [filteredInitialSections]);

  // Re-fetch sections from database
  const refreshSections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('omd_id', omdId)
        .order('order_index');

      if (error) throw error;
      if (data) {
        setSections(data.filter((section) => ALLOWED_SECTION_TYPES.has(section.type)));
      }
    } catch (error) {
      console.error('Failed to refresh sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (newOrder: Section[]) => {
    setSections(newOrder);
    
    // Update order in database
    // TODO: Implement API route for bulk update
    console.log('New order:', newOrder.map(s => s.id));
  };

  const toggleVisibility = async (section: Section) => {
    try {
      const { error } = await supabase
        .from('sections')
        .update({ is_visible: !section.is_visible })
        .eq('id', section.id);

      if (error) throw error;
      
      // Refresh sections to show updated visibility
      await refreshSections();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  const getSectionIcon = (type: string) => {
    const icons: Record<string, string> = {
      hero: '🎯',
      explore: '🔍',
      stays: '🏨',
      restaurants: '🍽️',
      experiences: '🎟️',
      events: '🎉',
      stories: '📖',
      map: '🗺️',
      list_business_cta: '📝',
      footer: '👣',
    };
    return icons[type] || '📄';
  };

  const getSectionTitle = (section: Section) => {
    return section.content?.title || `${section.type.charAt(0).toUpperCase() + section.type.slice(1)} Section`;
  };

  const handleTemplateChange = useCallback(
    async (templateName: TemplateName) => {
      setTemplate(templateName);
      setTemplateMessage(null);
      setSavingTemplate(true);
      try {
        const nextSettings = {
          ...settings,
          template: templateName,
        };
        const { error } = await supabase
          .from('omds')
          .update({ settings: nextSettings })
          .eq('id', omdId);

        if (error) throw error;

        setTemplateMessage('Template updated successfully.');
      } catch (error) {
        console.error('Failed to update template:', error);
        setTemplateMessage('Failed to update template. Please try again.');
      } finally {
        setSavingTemplate(false);
      }
    },
    [omdId, settings, supabase]
  );

  return (
    <div>
      {canEditTemplate && (
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-xl font-semibold text-blue-900">Appearance Settings</h2>
          <p className="mt-1 text-sm text-blue-800">
            Choose how visitors experience <strong>{omdName}</strong>. Templates control hero layout, highlight cards, and explore page styling.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label htmlFor="template" className="text-sm font-medium text-blue-900">
              Destination template
            </label>
            <select
              id="template"
              value={template}
              onChange={(event) => handleTemplateChange(event.target.value as TemplateName)}
              className="w-full max-w-sm rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm focus:border-blue-400 focus:outline-none"
              disabled={savingTemplate}
            >
              {TEMPLATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
          </div>
          {templateMessage && (
            <p className="mt-3 text-sm text-blue-700">{templateMessage}</p>
          )}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Sections are currently limited to the fixed set <strong>Hero</strong>, <strong>Explore</strong>, <strong>Stay</strong>, <strong>Eat</strong>, <strong>Experience</strong>, and <strong>Footer</strong>. This prevents layout issues while templates evolve.
      </div>

      {editingSection ? (
        <SectionEditor
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onSave={async () => {
            // Refresh sections after save
            await refreshSections();
            setEditingSection(null);
          }}
        />
      ) : (
        <Reorder.Group
          axis="y"
          values={sections}
          onReorder={handleReorder}
          className="space-y-4"
        >
          {sections.map((section) => (
            <Reorder.Item
              key={section.id}
              value={section}
              className="rounded-lg bg-white p-6 shadow border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Drag Handle */}
                  <div className="cursor-move text-gray-400 hover:text-gray-600">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M4 8h16M4 16h16" />
                    </svg>
                  </div>

                  {/* Section Info */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getSectionIcon(section.type)}</span>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {getSectionTitle(section)}
                      </h3>
                      {!section.is_visible && (
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Type: {section.type} • Order: {section.order_index}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {/* Visibility Toggle */}
                  <button
                    onClick={() => toggleVisibility(section)}
                    className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                      section.is_visible
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {section.is_visible ? '👁️ Visible' : '🚫 Hidden'}
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => setEditingSection(section)}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    ✏️ Edit
                  </button>

                  {/* Translate Button */}
                  <button className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700">
                    🌐 Translate
                  </button>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {sections.length === 0 && (
        <div className="rounded-lg bg-gray-50 p-12 text-center">
          <p className="text-gray-600">
            No sections found. Click &quot;Add Section&quot; to create your first section.
          </p>
        </div>
      )}
    </div>
  );
}

