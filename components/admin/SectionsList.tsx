'use client';

import { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import type { Section } from '@/types';
import SectionEditor from './SectionEditor';

interface SectionsListProps {
  sections: Section[];
  omdId: string;
}

export default function SectionsList({ sections: initialSections, omdId }: SectionsListProps) {
  const [sections, setSections] = useState(initialSections);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const handleReorder = async (newOrder: Section[]) => {
    setSections(newOrder);
    
    // Update order in database
    // TODO: Implement API route for bulk update
    console.log('New order:', newOrder.map(s => s.id));
  };

  const toggleVisibility = async (section: Section) => {
    // TODO: Implement visibility toggle
    console.log('Toggle visibility:', section.id);
  };

  const getSectionIcon = (type: string) => {
    const icons: Record<string, string> = {
      hero: '🎯',
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

  return (
    <div>
      {editingSection ? (
        <SectionEditor
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onSave={() => {
            // TODO: Refresh sections
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
              className="rounded-lg bg-white p-6 shadow"
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
                      <h3 className="text-xl font-semibold">
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

