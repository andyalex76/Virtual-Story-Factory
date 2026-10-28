import React, { useMemo } from 'react';
import { marked } from 'marked';

// Configure marked options
marked.use({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', isStreaming = false }) => {
  const html = useMemo(() => {
    try {
      // If streaming, we might receive partial markdown syntax.
      // marked handles this relatively gracefully, but complex blocks might flicker.
      return marked.parse(content || '');
    } catch (e) {
      console.error("Markdown parsing error:", e);
      return content; // Fallback to raw text
    }
  }, [content]);

  return (
    <div
      className={`
        prose prose-invert prose-sm max-w-none
        prose-headings:font-serif prose-headings:font-bold prose-headings:text-slate-100
        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
        prose-p:leading-relaxed prose-p:text-slate-300
        prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-sky-300 prose-strong:font-bold
        prose-em:text-slate-400
        prose-code:text-emerald-300 prose-code:bg-slate-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-pre:p-4 prose-pre:rounded-lg
        prose-blockquote:border-l-4 prose-blockquote:border-sky-600 prose-blockquote:bg-slate-800/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-slate-400
        prose-ul:list-disc prose-ul:pl-4
        prose-ol:list-decimal prose-ol:pl-4
        prose-li:text-slate-300 prose-li:my-0.5
        ${className}
        ${isStreaming ? 'animate-pulse-subtle' : ''} 
      `}
      dangerouslySetInnerHTML={{ __html: html as string }}
    />
  );
};

export default MarkdownRenderer;