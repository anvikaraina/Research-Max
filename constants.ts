import { ChevronDown, Sparkles, Cpu, Zap, Search } from "lucide-react";
import { SUPPORTED_MODELS, type AIModel } from "../lib/ai-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ModelSelectorProps {
  selectedModel: AIModel | null;
  onSelect: (model: AIModel | null) => void;
  autoRoute: boolean;
  onToggleAuto: () => void;
}

export default function ModelSelector({ selectedModel, onSelect, autoRoute, onToggleAuto }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer bg-white shadow-sm transition-all hover:border-slate-400"
        >
          <span className={`w-2 h-2 rounded-full ${autoRoute ? 'bg-slate-900' : 'bg-slate-300'}`}></span>
          <span>{autoRoute ? "Smart Auto-Route" : selectedModel?.name || "Select Model"}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 right-0 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 overflow-hidden"
          >
            <div className="p-2 space-y-1">
              <button
                onClick={() => { onToggleAuto(); setIsOpen(false); }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${autoRoute ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Smart Auto Router</p>
                    <p className="text-[10px] opacity-70">Dynamically picks target model</p>
                  </div>
                </div>
                {autoRoute && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
              </button>

              <div className="h-px bg-slate-100 my-2" />

              {SUPPORTED_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => { onSelect(model); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedModel?.id === model.id && !autoRoute ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <Cpu className="w-4 h-4 shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm truncate">{model.name}</p>
                      {model.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${selectedModel?.id === model.id && !autoRoute ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate ${selectedModel?.id === model.id && !autoRoute ? 'opacity-70' : 'text-slate-400'}`}>
                      {model.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
