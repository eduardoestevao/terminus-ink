import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export default function Markdown({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
    <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-medium text-text">{children}</strong>
        ),
        em: ({ children }) => <em>{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold transition-colors hover:text-gold-light"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-text">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-xs leading-relaxed text-text-secondary">
            {children}
          </pre>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc pl-5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal pl-5 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li className="mb-1">{children}</li>,
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt || ""}
            className="my-3 max-w-full rounded-lg border border-border"
            loading="lazy"
          />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
    </div>
  );
}
