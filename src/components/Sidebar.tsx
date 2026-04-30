import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SquarePen, 
  Search, 
  FolderPlus, 
  History, 
  MoreHorizontal, 
  Pin, 
  Trash2, 
  Edit3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onPinSession: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  isCollapsed,
  onToggleCollapse
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isRecentsExpanded, setIsRecentsExpanded] = useState(true);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
      // If clicking outside the sidebar or specifically outside an open nav menu, close it
      if (activeMenuId && ! (target as HTMLElement).closest('.chat-nav-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  return (
    <motion.div 
      ref={sidebarContainerRef}
      initial={false}
      animate={{ width: isCollapsed ? 0 : 280 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="h-full flex flex-col bg-white border-r border-border relative z-50 select-none overflow-hidden"
    >
      {/* Sidebar Header */}
      <div className="p-4 flex flex-col gap-2">
        <button 
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl bg-white border border-border hover:bg-bg-alt transition-colors font-medium text-sm active:scale-[0.98]"
        >
          <SquarePen className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        <div className="flex flex-col gap-0.5 mt-2">
          <SidebarAction icon={Search} label="Search" />
          <SidebarAction icon={FolderPlus} label="Projects" />
          <SidebarAction icon={History} label="History" />
        </div>
      </div>

      {/* Recents Section */}
      <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
        <button 
          onClick={() => setIsRecentsExpanded(!isRecentsExpanded)}
          className="w-full mt-4 mb-2 px-2 flex items-center justify-between group cursor-pointer"
        >
          <span className="text-[11px] font-bold text-text-dim uppercase tracking-wider">Recent</span>
          <ChevronDown className={`w-3 h-3 text-text-dim transition-transform duration-200 ${isRecentsExpanded ? '' : '-rotate-90'}`} />
        </button>
        
        <AnimatePresence>
          {isRecentsExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-0.5 overflow-hidden"
            >
              {sessions.map((session) => (
                <ChatNavItem 
                  key={session.id} 
                  session={session} 
                  isActive={activeSessionId === session.id}
                  onSelect={() => onSelectSession(session.id)}
                  onMenuOpen={(id: string | null) => setActiveMenuId(id)}
                  isMenuOpen={activeMenuId === session.id}
                  onRename={(title: string) => onRenameSession(session.id, title)}
                  onDelete={() => onDeleteSession(session.id)}
                  onPin={() => onPinSession(session.id)}
                />
              ))}
              {sessions.length === 0 && (
                <div className="px-3 py-2 text-xs text-text-dim/60 italic">No recent chats</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Account Section */}
      <div className="p-4 border-t border-border bg-bg-alt/50">
        <div className="relative" ref={accountMenuRef}>
          <button 
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:border-border border border-transparent transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-[12px] font-bold shrink-0">
              AR
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-text truncate">Anvika Raina</div>
              <div className="text-[11px] text-text-dim">Personal Workspace</div>
            </div>
          </button>

          <AnimatePresence>
            {isAccountMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden py-1 z-[60]"
              >
                <div className="px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-text-dim border-b border-border mb-1">Account</div>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-bg-alt transition-colors">
                  <Settings className="w-4 h-4 text-text-dim" />
                  <span>Settings</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse Toggle (Custom UI) */}
      <button 
        onClick={onToggleCollapse}
        className="absolute top-4 right-4 p-2 bg-white border border-[#D1D5DB] hover:bg-bg-alt rounded-xl text-text transition-all active:scale-95 shadow-md z-[100]"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

const SidebarAction = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-3 px-2.5 py-1.5 rounded-2xl hover:bg-white hover:border-border border border-transparent transition-all group group font-medium text-text-dim hover:text-text"
  >
    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" strokeWidth={2} />
    <span className="text-sm truncate">{label}</span>
  </button>
);

const ChatNavItem = ({ session, isActive, onSelect, onMenuOpen, isMenuOpen, onRename, onDelete, onPin }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);

  useEffect(() => {
    if (isEditing) setEditValue(session.title);
  }, [isEditing, session.title]);

  const handleRename = () => {
    if (editValue.trim() && editValue !== session.title) {
      onRename(editValue);
    }
    setIsEditing(false);
  };

  return (
    <div className="relative group chat-nav-menu-container">
      <div 
        onClick={() => !isEditing && onSelect()}
        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-2xl cursor-pointer transition-all ${
          isActive 
          ? 'bg-bg-alt border-border border text-text' 
          : 'text-text-dim hover:bg-bg-alt border border-transparent hover:text-text'
        }`}
      >
        {isEditing ? (
          <input
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
        ) : (
          <div className="flex-1 min-w-0 text-sm font-medium leading-tight truncate">
            {session.title}
          </div>
        )}

        {!isEditing && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onMenuOpen(isMenuOpen ? null : session.id);
            }}
            className={`p-1 hover:bg-bg-alt rounded-md transition-opacity shrink-0 ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-text-dim" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -5 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E5E7EB] rounded-xl z-[100] py-1"
          >
            <button onClick={(e) => { e.stopPropagation(); onPin(); onMenuOpen(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-bg-alt transition-colors font-medium">
              <Pin className="w-3.5 h-3.5 text-text-dim" />
              <span>{session.isPinned ? 'Unpin' : 'Pin'}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); onMenuOpen(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-bg-alt transition-colors font-medium">
              <Edit3 className="w-3.5 h-3.5 text-text-dim" />
              <span>Rename</span>
            </button>
            <div className="h-[1px] bg-border my-1" />
            <button onClick={(e) => { e.stopPropagation(); onDelete(); onMenuOpen(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
