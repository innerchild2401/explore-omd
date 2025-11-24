import type { ContentBlock } from '@/types';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface ContentBlockRendererProps {
  block: ContentBlock;
}

// Simple markdown parser for bold, italic, and links
function parseMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Pattern for **bold**, *italic*, and [link](url)
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
    { regex: /\*([^*]+)\*/g, type: 'italic' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },
  ];
  
  const matches: Array<{ start: number; end: number; type: string; content: string; url?: string }> = [];
  
  patterns.forEach(({ regex, type }) => {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type,
        content: match[1],
        url: match[2],
      });
    }
  });
  
  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);
  
  // Remove overlapping matches (keep first)
  const filteredMatches: typeof matches = [];
  let lastEnd = 0;
  for (const match of matches) {
    if (match.start >= lastEnd) {
      filteredMatches.push(match);
      lastEnd = match.end;
    }
  }
  
  // Build React elements
  let currentIndex = 0;
  filteredMatches.forEach((match) => {
    // Add text before match
    if (match.start > currentIndex) {
      parts.push(text.substring(currentIndex, match.start));
    }
    
    // Add formatted content
    if (match.type === 'bold') {
      parts.push(<strong key={`${match.start}-bold`}>{match.content}</strong>);
    } else if (match.type === 'italic') {
      parts.push(<em key={`${match.start}-italic`}>{match.content}</em>);
    } else if (match.type === 'link') {
      parts.push(
        <a
          key={`${match.start}-link`}
          href={match.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 underline"
        >
          {match.content}
        </a>
      );
    }
    
    currentIndex = match.end;
  });
  
  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

export default function ContentBlockRenderer({ block }: ContentBlockRendererProps) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-lg leading-relaxed text-gray-900 my-6">
          {parseMarkdown(block.content)}
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
              <li key={index} className="pl-2">{parseMarkdown(item)}</li>
            ))}
          </ol>
        );
      } else {
        return (
          <ul className="my-6 list-disc list-inside space-y-3 text-lg leading-relaxed text-gray-900">
            {block.items.map((item, index) => (
              <li key={index} className="pl-2">{parseMarkdown(item)}</li>
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
