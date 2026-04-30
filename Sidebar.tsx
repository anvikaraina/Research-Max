import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { Cpu, Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import AnimatedMessageContent from "./AnimatedMessageContent";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  isStreaming?: boolean;
  status?: "streaming" | "completed" | "failed";
}

export const Message = React.memo(({ role, content, model_used, isStreaming, status }: MessageProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const processedUserContent = useMemo(() => {
    if (role !== "user") return content;
    return content
      .replace(/\\\((.*?)\\\)/g, '$ $1 $')
      .replace(/\\\[(.*?)\\\]/gs, '$$$$\n$1\n$$$$');
  }, [content, role]);

  return (
    <div className={`py-5 w-full ${role === "user" ? "" : "bg-transparent"}`}>
      <div className={`max-w-3xl mx-auto px-4 flex gap-4 md:gap-5 group ${role === "user" ? "justify-end" : "justify-start"}`}>
        {/* Content Container */}
        <div className={`min-w-0 flex flex-col ${role === "user" ? "items-end" : "items-start"} w-full`}>
          <div className={`w-full ${role === "user" ? "flex flex-col items-end" : ""}`}>
            {role === "user" ? (
              <div className="bg-slate-100/70 text-slate-800 px-4 py-2 rounded-[20px] shadow-sm inline-block border border-slate-200/40 max-w-[85%] font-medium text-[14.5px]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                >
                  {processedUserContent}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="w-full relative px-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center text-white p-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{model_used || "Assistant"}</span>
                </div>
                <AnimatedMessageContent content={content} isStreaming={isStreaming} status={status} />
                <div className="flex items-center justify-start mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-all sm:border sm:border-transparent sm:hover:border-slate-200"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

Message.displayName = "Message";
