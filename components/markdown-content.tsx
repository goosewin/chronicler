'use client';

import { cn } from '@/lib/utils';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

const components = {
  a: ({ className, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <Link
      className={className}
      href={href || '#'}
      {...props}
    />
  ),
};

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processMarkdown() {
      if (!content) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const serialized = await serialize(content, {
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeHighlight, rehypeSlug],
          },
        });

        setMdxSource(serialized);
        setIsLoading(false);
      } catch (err) {
        console.error('Error processing markdown:', err);
        setError('Failed to process markdown content');
        setIsLoading(false);
      }
    }

    processMarkdown();
  }, [content]);

  if (isLoading) {
    return <div className={cn('prose dark:prose-invert', className)}>Loading content...</div>;
  }

  if (error) {
    return <div className={cn('prose dark:prose-invert text-red-500', className)}>Error: {error}</div>;
  }

  if (!mdxSource) {
    return <div className={cn('prose dark:prose-invert', className)}>No content available</div>;
  }

  return (
    <div className={cn('prose dark:prose-invert', className)}>
      <MDXRemote {...mdxSource} components={components} />
    </div>
  );
} 
