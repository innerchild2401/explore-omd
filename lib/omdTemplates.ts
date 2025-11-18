export type TemplateName = 'classic' | 'story' | 'map';

export interface TemplateOption {
  value: TemplateName;
  label: string;
  description: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    value: 'classic',
    label: 'Classic',
    description: 'Gradient hero, horizontal carousels, neutral cards.',
  },
  {
    value: 'story',
    label: 'Story',
    description: 'Full-bleed imagery, stacked story cards, soft typography.',
  },
  {
    value: 'map',
    label: 'Map Peek',
    description: 'Map highlights, airy cards, planner-friendly layout.',
  },
];

export const DEFAULT_TEMPLATE: TemplateName = 'classic';







