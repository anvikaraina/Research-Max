import { ChevronUp, Plus, Globe, Lightbulb, Telescope, Paperclip, X, Upload } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export type ToolType = "web_search" | "thinking" | "research" | "file_search";

interface InputBoxProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (tools?: ToolType[]) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

const TOOLS = [
  { id: "web_search" as ToolType, name: "Web Search", icon: Globe },
  { id: "thinking" as ToolType, name: "Thinking", icon: Lightbulb },
  { id: "research" as ToolType, name: "Research", icon: Telescope },
  { id: "file_search" as ToolType, name: "File Search", icon: Paperclip },
];

export default function InputBox({ value, onChange, onSend, disabled, isStreaming, onStop }: InputBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTools, setShowTools] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolType[]>([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFocus = () => {
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    if (!value.trim() || isStreaming) return;
    onSend(activeTools);
  };

  const toggleTool = (toolId: ToolType) => {
    setActiveTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(t => t !== toolId)
        : [...prev, toolId]
    );
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 relative">
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute bottom-full left-4 mb-3 w-60 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-200/60 p-1.5 z-50 overflow-hidden"
          >
            <div className="px-2.5 py-1.5 mb-1 flex items-center justify-between border-b border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assistant Tools</span>
              <button 
                onClick={() => setShowTools(false)}
                className="text-slate-300 hover:text-slate-900 transition-colors"
                aria-label="Close tools menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              {TOOLS.map((tool) => {
                const isActive = activeTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all text-left",
                      isActive ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-colors border",
                      isActive ? "bg-white/10 border-white/5" : "bg-slate-50 border-slate-100"
                    )}>
                      <tool.icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-slate-900")} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[12.5px] font-semibold tracking-tight">{tool.name}</p>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center">
        <div 
          className={cn(
            "w-full relative group bg-white border rounded-[28px] transition-all px-3 py-1.5 min-h-[52px] flex flex-col justify-center",
            "border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]",
            "focus-within:border-slate-400/60 focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
          )}
          onClick={handleFocus}
        >
          {activeTools.length > 0 && (
            <div className="flex flex-wrap gap-1 px-1.5 pt-1.5 pb-0.5" onClick={(e) => e.stopPropagation()}>
              {activeTools.map(toolId => {
                const tool = TOOLS.find(t => t.id === toolId);
                if (!tool) return null;
                return (
                  <div 
                    key={toolId}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 text-white rounded-full text-[9px] font-bold transition-all border border-slate-800"
                  >
                    <tool.icon className="w-2.5 h-2.5 text-white" />
                    <span className="uppercase tracking-wider">{tool.name}</span>
                    <button 
                      onClick={() => toggleTool(toolId)}
                      className="hover:text-slate-300 ml-1"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="flex items-end gap-0.5">
            <div className="flex items-center self-end pb-1.5" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setShowTools(!showTools)}
                className={cn(
                  "p-2 rounded-full transition-all flex-shrink-0",
                  showTools ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                )}
                aria-label="Toggle tools"
              >
                <Plus className={cn("w-5 h-5 transition-transform duration-300", showTools && "rotate-45")} />
              </button>
              
              <button 
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
                aria-label="Upload file"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </button>
            </div>

            <textarea 
              ref={textareaRef}
              className="flex-1 bg-transparent border-none focus:ring-0 outline-none resize-none font-medium text-[15px] leading-relaxed p-2.5 placeholder-slate-300 min-h-[44px] max-h-[200px] scrollbar-hide text-slate-900"
              placeholder="Message Framr..."
              rows={1}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled && !isStreaming}
            />

            <div className="flex items-center pb-1.5 self-end pr-1" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={isStreaming ? onStop : handleSend}
                disabled={!isStreaming && (!value.trim() || disabled)}
                className={cn(
                  "h-8.5 w-8.5 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90",
                  isStreaming || value.trim() ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "bg-slate-100 text-slate-300"
                )}
                aria-label={isStreaming ? "Stop generation" : "Send message"}
              >
                <motion.div
                  animate={isStreaming ? { opacity: [1, 0.5, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {isStreaming ? (
                    <div className="w-2.5 h-2.5 bg-white rounded-sm" />
                  ) : (
                    <ChevronUp className="w-5.5 h-5.5" />
                  )}
                </motion.div>
              </button>
            </div>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2.5 opacity-40">
          Framr matches your intent with optimized reasoning logic.
        </p>
      </div>
    </div>
  );
}

