import type { ReactNode } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { safeHttpUrl, UGC_REL } from '@/lib/seedit';
import styles from '@/styles/seedit/components/markdown.module.css';

/** Seedit skips GFM on very long content (markdown.tsx MAX_LENGTH_FOR_GFM). */
const MAX_LENGTH_FOR_GFM = 10000;

// Seedit's schema: rehype-sanitize's default (GitHub's) plus plain spans.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'span'],
  attributes: { ...defaultSchema.attributes, span: ['className'] },
};

// rehype-sanitize 5.0.1 (Seedit's pinned version) still types itself against an
// older vfile; it runs fine under react-markdown 10, so only the type is cast.
const rehypePlugins = [[rehypeSanitize, schema]] as unknown as Options['rehypePlugins'];

const isEmpty = (children: ReactNode) =>
  !children ||
  (Array.isArray(children) && children.every((child) => child === null || child === undefined || (typeof child === 'string' && child.trim() === '')));

// Seedit renders embedded media as text; here an http(s) source becomes a plain link.
function MediaAsText({ src, alt }: { src?: unknown; alt?: unknown }) {
  const url = typeof src === 'string' ? safeHttpUrl(src) : undefined;
  const label = (typeof src === 'string' && src) || (typeof alt === 'string' && alt) || 'image';
  return url ? (
    <a href={url} target="_blank" rel={UGC_REL}>
      {label}
    </a>
  ) : (
    <span>{label}</span>
  );
}

const components: Components = {
  a: ({ children, href }) => {
    if (!href) return <span>{children}</span>;
    if (href.startsWith('#')) return <a href={href}>{children}</a>;
    return (
      <a href={href} target="_blank" rel={UGC_REL}>
        {children}
      </a>
    );
  },
  p: ({ children }) => (isEmpty(children) ? null : <p>{children}</p>),
  img: ({ src, alt }) => <MediaAsText src={src} alt={alt} />,
};

/**
 * Server port of Seedit's Markdown (src/components/markdown/markdown.tsx):
 * react-markdown + remark-gfm + rehype-sanitize with Seedit's schema and
 * element overrides. Raw HTML in the source is shown as text (Seedit parses it
 * with rehype-raw before sanitizing), and Seedit's superscript/spoiler/5chan
 * quote extensions are not ported.
 */
export function Markdown({ content }: { content: string }) {
  return (
    <span className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={content.length <= MAX_LENGTH_FOR_GFM ? [[remarkGfm, { singleTilde: false }]] : []}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
}
