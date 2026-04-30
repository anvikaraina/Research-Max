import React, { useMemo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { motion, AnimatePresence } from "motion/react";
import 'katex/dist/katex.min.css';

interface AnimatedMessageContentProps {
  content: string;
  isStreaming?: boolean;
  status?: "streaming" | "completed" | "failed";
}

const MemoizedMarkdown = React.memo(({ content }: { content: string }) => {
  const processedContent = useMemo(() => {
    return content
      .replace(/\\\((.*?)\\\)/g, '$ $1 $') // Inline math
      .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$\n$1\n$$$$') // Display math
      .replace(/\\textbf\{(.*?)\}/g, '**$1**')
      .replace(/\\textit\{(.*?)\}/g, '*$1*')
      .replace(/\\section\{(.*?)\}/g, '# $1')
      .replace(/\\subsection\{(.*?)\}/g, '## $1')
      // Fix for common raw LaTeX appearing in markdown
      .replace(/\\(frac|sqrt|partial|nabla|sum|int|prod|alpha|beta|gamma|delta|theta|lambda|pi|phi|omega|times|div|pm|mp|le|ge|neq|approx|infty|cdot|dots|rightarrow|leftarrow|uparrow|downarrow)/g, (match) => `\$${match}\$`);
  }, [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        code: ({ node, inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline ? (
            <div className="relative group my-4">
              <pre className="overflow-x-auto p-4 rounded-xl bg-slate-900 text-slate-50 text-sm font-mono scrollbar-hide">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
              {match && (
                <div className="absolute top-2 right-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{match[1]}</div>
              )}
            </div>
          ) : (
            <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[13px] font-mono" {...props}>
              {children}
            </code>
          );
        },
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
});

MemoizedMarkdown.displayName = "MemoizedMarkdown";

const ShimmerThinking = () => (
  <div className="flex flex-col gap-2 w-full animate-pulse">
    <div className="h-4 bg-slate-100 rounded-full w-3/4 shimmer-bg" />
    <div className="h-4 bg-slate-100 rounded-full w-1/2 shimmer-bg" />
    <div className="h-4 bg-slate-100 rounded-full w-2/3 shimmer-bg" />
    <style>{`
      .shimmer-bg {
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite linear;
      }
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

export default function AnimatedMessageContent({ content, isStreaming, status }: AnimatedMessageContentProps) {
  const [displayContent, setDisplayContent] = useState(content);
  
  // Update display content immediately during streaming to keep it snappy
  useEffect(() => {
    if (status === "streaming") {
      setDisplayContent(content);
    } else {
      setDisplayContent(content);
    }
  }, [content, status]);

  return (
    <motion.div
      initial={status === "streaming" && content === "" ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="markdown-body w-full prose prose-slate max-w-none text-slate-800 dark:text-slate-200"
    >
      {status === "streaming" && content === "" ? (
        <ShimmerThinking />
      ) : (
        <>
          <MemoizedMarkdown content={displayContent} />
          {status === "streaming" && isStreaming && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block w-2 h-5 ml-1 bg-slate-800 rounded-sm align-middle"
            />
          )}
        </>
      )}
    </motion.div>
  );
}
