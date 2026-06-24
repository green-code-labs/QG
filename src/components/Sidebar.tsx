"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Conversation, Folder } from "@/types/tree";
import { cn } from "@/lib/utils";
import {
  Plus,
  FolderPlus,
  ChevronRight,
  MessageSquare,
  LogOut,
  LogIn,
  Loader2,
  Trash2,
  Check,
  X,
  GitBranch,
} from "lucide-react";

interface Props {
  conversations: Conversation[];
  folders: Folder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: (folderId?: string) => void;
  onDeleteConversation: (id: string) => void;
  onCreateFolder: (name: string, emoji: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveConversation: (convId: string, folderId?: string) => void;
}

export function Sidebar({
  conversations,
  folders,
  activeId,
  onSelect,
  onNewConversation,
  onDeleteConversation,
  onCreateFolder,
  onDeleteFolder,
  onMoveConversation,
}: Props) {
  const { data: session, status } = useSession();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderEmoji, setNewFolderEmoji] = useState("📁");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function submitFolder() {
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), newFolderEmoji);
    setNewFolderName("");
    setNewFolderEmoji("📁");
    setCreatingFolder(false);
  }

  function handleDrop(targetFolderId?: string) {
    if (dragging) {
      onMoveConversation(dragging, targetFolderId);
      setDragging(null);
      setDragOver(null);
    }
  }

  const unfiled = conversations.filter((c) => !c.folderId);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">QG</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
            <LogIn className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Entre para salvar</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Suas conversas e árvores ficam salvas na nuvem
            </p>
          </div>
          <button
            onClick={() => signIn("google")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors w-full justify-center"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <GitBranch className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">QG</span>
        </div>
        <button
          onClick={() => onNewConversation()}
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
          const folderConvos = conversations.filter((c) => c.folderId === folder.id);
          const isExpanded = expandedFolders.has(folder.id);
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
                onDrop={() => handleDrop(folder.id)}
              >
                <ChevronRight
                  className={cn(
                    "w-3 h-3 text-muted-foreground transition-transform shrink-0",
                    isExpanded && "rotate-90"
                  )}
                />
                <span className="text-sm">{folder.emoji}</span>
                <span className="text-[12px] font-medium text-foreground flex-1 truncate">
                  {folder.name}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); onNewConversation(folder.id); }}
                    className="p-0.5 rounded hover:text-primary text-muted-foreground"
                    title="Nova conversa nesta pasta"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                    className="p-0.5 rounded hover:text-red-500 text-muted-foreground"
                    title="Excluir pasta"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {folderConvos.length > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-1">{folderConvos.length}</span>
                )}
              </div>

              {isExpanded && (
                <div className="ml-4 pl-2 border-l border-border/50 mt-0.5 space-y-0.5">
                  {folderConvos.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-2 py-1">Vazia</p>
                  ) : (
                    folderConvos.map((c) => (
                      <ConversationItem
                        key={c.id}
                        conversation={c}
                        active={activeId === c.id}
                        onSelect={onSelect}
                        onDelete={onDeleteConversation}
                        onDragStart={() => setDragging(c.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* New folder button */}
        {creatingFolder ? (
          <div className="px-2 py-1.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                value={newFolderEmoji}
                onChange={(e) => setNewFolderEmoji(e.target.value)}
                className="w-8 text-center bg-secondary border border-border rounded text-sm outline-none"
                maxLength={2}
              />
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitFolder(); if (e.key === "Escape") setCreatingFolder(false); }}
                placeholder="Nome da pasta"
                className="flex-1 text-[12px] bg-secondary border border-border rounded px-2 py-1 text-foreground outline-none focus:border-primary/50"
              />
              <button onClick={submitFolder} className="p-1 text-primary hover:text-primary/80">
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

        {/* Separator if needed */}
        {(folders.length > 0 || creatingFolder) && unfiled.length > 0 && (
          <div className="border-t border-border/50 my-1" />
        )}

        {/* Unfiled conversations */}
        {unfiled.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            active={activeId === c.id}
            onSelect={onSelect}
            onDelete={onDeleteConversation}
            onDragStart={() => setDragging(c.id)}
          />
        ))}
      </div>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          {session.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {session.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <span className="text-[11px] text-foreground flex-1 truncate">{session.user?.name}</span>
          <button
            onClick={() => signOut()}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
  onDragStart,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
        active ? "bg-primary/10 text-foreground" : "hover:bg-secondary text-foreground/80"
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <MessageSquare className="w-3 h-3 shrink-0 text-muted-foreground" />
      <span className="text-[12px] flex-1 truncate">{conversation.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(conversation.id); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 text-muted-foreground transition-opacity shrink-0"
        title="Excluir"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
