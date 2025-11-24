import type { ContentBlock } from '@/types';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface ContentBlockRendererProps {
  block: ContentBlock;
}

export default function ContentBlockRenderer({ block }: ContentBlockRendererProps) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-lg leading-relaxed text-gray-900 my-6">
          {block.content}
        </p>
      );

    case 'heading':
      const headingClass = 
        block.level === 1 ? 'text-4xl font-bold text-gray-900 leading-tight mt-8 mb-4' :
        block.level === 2 ? 'text-3xl font-bold text-gray-900 leading-snug mt-8 mb-4' :
        'text-2xl font-semibold text-gray-900 leading-snug mt-6 mb-3';
      const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;
      return <HeadingTag className={headingClass}>{block.content}</HeadingTag>;

    case 'image':
      return (
        <figure className="my-8">
          <OptimizedImage
            src={getImageUrl(block.url)}
            alt={block.alt}
            width={1200}
            height={800}
            className={`w-full rounded-lg shadow-md ${block.width === 'full' ? '' : 'max-w-3xl mx-auto'}`}
          />
          {block.caption && (
            <figcaption className="mt-3 text-sm text-gray-600 text-center italic">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'quote':
      return (
        <blockquote className="border-l-4 border-blue-600 pl-6 py-4 my-6 bg-blue-50 rounded-r-lg">
          <p className="text-xl leading-relaxed text-gray-700 italic">
            &ldquo;{block.content}&rdquo;
          </p>
          {block.attribution && (
            <cite className="block mt-3 text-sm text-gray-600 not-italic">
              — {block.attribution}
            </cite>
          )}
        </blockquote>
      );

    case 'list':
      if (block.style === 'ordered') {
        return (
          <ol className="my-6 list-decimal list-inside space-y-3 text-lg leading-relaxed text-gray-900">
            {block.items.map((item, index) => (
              <li key={index} className="pl-2">{item}</li>
            ))}
          </ol>
        );
      } else {
        return (
          <ul className="my-6 list-disc list-inside space-y-3 text-lg leading-relaxed text-gray-900">
            {block.items.map((item, index) => (
              <li key={index} className="pl-2">{item}</li>
            ))}
          </ul>
        );
      }

    case 'divider':
      return <hr className="my-8 border-t border-gray-300" />;

    case 'code':
      return (
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-6 my-6 overflow-x-auto">
          <code className="text-sm leading-relaxed font-mono">
            {block.code}
          </code>
        </pre>
      );

    case 'callout':
      const calloutStyles = {
        info: 'bg-blue-50 border-blue-600',
        warning: 'bg-yellow-50 border-yellow-600',
        success: 'bg-green-50 border-green-600',
      };
      return (
        <div className={`my-6 p-4 rounded-lg border-l-4 ${calloutStyles[block.style]}`}>
          <p className="text-lg leading-relaxed text-gray-900">
            {block.content}
          </p>
        </div>
      );

    default:
      return null;
  }
}

