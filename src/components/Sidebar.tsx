"use client";

import { useState } from "react";
import { Conversation, Folder } from "@/types/tree";
import { cn } from "@/lib/utils";
import {
  Plus,
  FolderPlus,
  ChevronRight,
  MessageSquare,
  Trash2,
  Check,
  X,
  GitBranch,
  LogOut,
} from "lucide-react";
import { SessionUser } from "@/lib/storage";

interface Props {
  user: SessionUser;
  conversations: Conversation[];
  folders: Folder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: (folderId?: string) => void;
  onDelete: (id: string) => void;
  onCreateFolder: (name: string, emoji: string) => void;
  onDeleteFolder: (id: string) => void;
  onMove: (convId: string, folderId?: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  user,
  conversations,
  folders,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onCreateFolder,
  onDeleteFolder,
  onMove,
  onLogout,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderEmoji, setFolderEmoji] = useState("📁");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  function toggleFolder(id: string) {
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function submitFolder() {
    if (!folderName.trim()) return;
    onCreateFolder(folderName.trim(), folderEmoji);
    setFolderName("");
    setFolderEmoji("📁");
    setCreatingFolder(false);
  }

  function drop(targetFolderId?: string) {
    if (dragging) {
      onMove(dragging, targetFolderId);
      setDragging(null);
      setDragOver(null);
    }
  }

  const unfiled = conversations.filter((c) => !c.folderId);

  return (
    <div className="flex flex-col h-full">
      {/* Logo + new btn */}
      <div className="px-3 py-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <GitBranch className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">QG</span>
        </div>
        <button
          onClick={() => onNew()}
          className="w-full flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-[12px] font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova conversa
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {/* Folders */}
        {folders.map((folder) => {
          const items = conversations.filter((c) => c.folderId === folder.id);
          const isOpen = expanded.has(folder.id);
          const isOver = dragOver === folder.id;
          return (
            <div key={folder.id}>
              <div
                className={cn(
                  "group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
                  isOver ? "bg-primary/10" : "hover:bg-secondary"
                )}
                onClick={() => toggleFolder(folder.id)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(folder.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => drop(folder.id)}
              >
                <ChevronRight
                  className={cn(
                    "w-3 h-3 text-muted-foreground transition-transform shrink-0",
                    isOpen && "rotate-90"
                  )}
                />
                <span className="text-sm">{folder.emoji}</span>
                <span className="text-[12px] font-medium text-foreground flex-1 truncate">
                  {folder.name}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); onNew(folder.id); }}
                    className="p-1 rounded hover:text-primary text-muted-foreground"
                    title="Nova conversa nesta pasta"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                    className="p-1 rounded hover:text-red-500 text-muted-foreground"
                    title="Excluir pasta"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {items.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                )}
              </div>

              {isOpen && (
                <div className="ml-4 pl-2 border-l border-border/50 mt-0.5 space-y-0.5">
                  {items.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-2 py-1">Vazia</p>
                  ) : (
                    items.map((c) => (
                      <ConvItem
                        key={c.id}
                        conv={c}
                        active={activeId === c.id}
                        onSelect={onSelect}
                        onDelete={onDelete}
                        onDragStart={() => setDragging(c.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* New folder */}
        {creatingFolder ? (
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <input
                value={folderEmoji}
                onChange={(e) => setFolderEmoji(e.target.value)}
                className="w-8 text-center bg-secondary border border-border rounded text-sm outline-none"
                maxLength={2}
              />
              <input
                autoFocus
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitFolder();
                  if (e.key === "Escape") setCreatingFolder(false);
                }}
                placeholder="Nome da pasta"
                className="flex-1 text-[12px] bg-secondary border border-border rounded px-2 py-1 text-foreground outline-none focus:border-primary/50"
              />
              <button onClick={submitFolder} className="p-1 text-primary">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCreatingFolder(false)} className="p-1 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreatingFolder(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Nova pasta
          </button>
        )}

        {/* Divider */}
        {(folders.length > 0 || creatingFolder) && unfiled.length > 0 && (
          <div className="border-t border-border/50 my-1" />
        )}

        {/* Unfiled */}
        <div
          className={cn("min-h-[4px] rounded", dragOver === "root" && "bg-primary/10")}
          onDragOver={(e) => { e.preventDefault(); setDragOver("root"); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => drop(undefined)}
        >
          {unfiled.map((c) => (
            <ConvItem
              key={c.id}
              conv={c}
              active={activeId === c.id}
              onSelect={onSelect}
              onDelete={onDelete}
              onDragStart={() => setDragging(c.id)}
            />
          ))}
        </div>
      </div>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConvItem({
  conv,
  active,
  onSelect,
  onDelete,
  onDragStart,
}: {
  conv: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => onSelect(conv.id)}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
        active ? "bg-primary/10 text-foreground" : "hover:bg-secondary text-foreground/80"
      )}
    >
      <MessageSquare className="w-3 h-3 shrink-0 text-muted-foreground" />
      <span className="text-[12px] flex-1 truncate">{conv.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 text-muted-foreground shrink-0"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
