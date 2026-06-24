"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Message, LifeTree, TreeNodeData,
  Conversation, Folder, FileAttachment,
} from "@/types/tree";
import { storage, session, SessionUser } from "@/lib/storage";
import { DecisionTree } from "@/components/tree/DecisionTree";
import { Sidebar } from "@/components/Sidebar";
import { AuthScreen } from "@/components/AuthScreen";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  Send, Loader2, GitBranch, Sparkles,
  RotateCcw, User, Bot, Paperclip, X,
  FileText, FileCode2, File,
} from "lucide-react";

const EXAMPLES = [
  "Sou dev com 3 anos de exp. Quero entrar em IA ou empreender. Me ajude a mapear os caminhos.",
  "Acabei de receber uma proposta de emprego melhor. Como isso muda minha árvore?",
  "Quero ser freelancer em 1 ano. Quais são meus próximos passos?",
];

const ACCEPT = [
  "image/*", "application/pdf",
  ".txt", ".md", ".csv", ".json",
  ".js", ".ts", ".jsx", ".tsx", ".py", ".java",
  ".go", ".rs", ".rb", ".php", ".sh", ".yaml", ".yml",
].join(",");

const TEXT_PREFIXES = ["text/", "application/json", "application/xml"];
const TEXT_EXTS = /\.(txt|md|csv|json|js|ts|jsx|tsx|py|java|go|rs|rb|php|sh|yaml|yml)$/i;

function isText(mimeType: string, name: string) {
  return TEXT_PREFIXES.some((p) => mimeType.startsWith(p)) || TEXT_EXTS.test(name);
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return null;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.startsWith("text/") || mimeType.includes("json")) return FileCode2;
  return File;
}

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false); // avoid flash

  const [folders, setFolders] = useState<Folder[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [tree, setTree] = useState<LifeTree | null>(null);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore session on mount
  useEffect(() => {
    const s = session.get();
    if (s) {
      setUser(s);
      loadUserData(s.id);
    }
    setAuthReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadUserData(userId: string) {
    setFolders(storage.getFolders(userId));
    setConversations(storage.getConversations(userId));
  }

  function handleLogin(u: SessionUser) {
    session.set(u);
    setUser(u);
    loadUserData(u.id);
  }

  function handleLogout() {
    session.clear();
    setUser(null);
    setFolders([]);
    setConversations([]);
    setActiveId(null);
    setMessages([]);
    setTree(null);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const persist = useCallback(
    (convId: string, msgs: Message[], t: LifeTree | null, title?: string) => {
      if (!user) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        storage.saveMessages(user.id, convId, msgs, t, title);
        setConversations(storage.getConversations(user.id));
      }, 800);
    },
    [user]
  );

  function selectConversation(id: string) {
    if (!user) return;
    const c = storage.getConversation(user.id, id);
    if (!c) return;
    setActiveId(id);
    setMessages(c.messages ?? []);
    setTree(c.tree ?? null);
    setPendingImages([]);
    setPendingFiles([]);
    setError(null);
  }

  function newConversation(folderId?: string) {
    if (!user) return;
    const c = storage.createConversation(user.id, "Nova conversa", folderId);
    setConversations(storage.getConversations(user.id));
    setActiveId(c.id);
    setMessages([]);
    setTree(null);
    setPendingImages([]);
    setPendingFiles([]);
    setError(null);
  }

  function deleteConversation(id: string) {
    if (!user) return;
    storage.deleteConversation(user.id, id);
    setConversations(storage.getConversations(user.id));
    if (activeId === id) {
      setActiveId(null); setMessages([]); setTree(null);
    }
  }

  function createFolder(name: string, emoji: string) {
    if (!user) return;
    storage.createFolder(user.id, name, emoji);
    setFolders(storage.getFolders(user.id));
  }

  function deleteFolder(id: string) {
    if (!user) return;
    storage.deleteFolder(user.id, id);
    setFolders(storage.getFolders(user.id));
    setConversations(storage.getConversations(user.id));
  }

  function moveConversation(convId: string, folderId?: string) {
    if (!user) return;
    storage.moveConversation(user.id, convId, folderId);
    setConversations(storage.getConversations(user.id));
  }

  async function handleAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result)
            setPendingImages((p) => [...p, ev.target!.result as string]);
        };
        reader.readAsDataURL(file);
      } else if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (!ev.target?.result) return;
          const base64 = (ev.target.result as string).split(",")[1];
          setPendingFiles((p) => [
            ...p,
            { name: file.name, mimeType: file.type, data: base64, size: file.size },
          ]);
        };
        reader.readAsDataURL(file);
      } else if (isText(file.type, file.name)) {
        const text = await file.text();
        setPendingFiles((p) => [
          ...p,
          { name: file.name, mimeType: file.type || "text/plain", data: text, size: file.size },
        ]);
      }
    }
  }

  async function sendMessage(content: string) {
    if (!user) return;
    const hasPending = pendingImages.length > 0 || pendingFiles.length > 0;
    if (!content.trim() && !hasPending) return;
    if (isLoading) return;

    let convId = activeId;
    if (!convId) {
      const c = storage.createConversation(user.id, content.slice(0, 60) || "Nova conversa");
      setConversations(storage.getConversations(user.id));
      setActiveId(c.id);
      convId = c.id;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
      files: pendingFiles.length > 0 ? [...pendingFiles] : undefined,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingImages([]);
    setPendingFiles([]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, currentTree: tree }),
      });
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message ?? "Árvore atualizada.",
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, assistantMsg];
      const finalTree = data.tree ? { ...data.tree, updatedAt: new Date().toISOString() } : tree;

      setMessages(finalMessages);
      if (data.tree) setTree(finalTree);

      const title = finalMessages.find((m) => m.role === "user")?.content?.slice(0, 60) || "Conversa";
      persist(convId, finalMessages, finalTree, title);
    } catch {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleNodeUpdate(nodeId: string, data: Partial<TreeNodeData>) {
    if (!user) return;
    setTree((prev) => {
      if (!prev) return prev;
      const updated: LifeTree = {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, ...data } : n)),
        updatedAt: new Date().toISOString(),
      };
      if (activeId) persist(activeId, messages, updated);
      return updated;
    });
  }

  function handleNodeComplete(nodeId: string, label: string) {
    if (!user) return;
    // Immediately mark as completed in the tree
    setTree((prev) => {
      if (!prev) return prev;
      const updated: LifeTree = {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, status: "completed" as const } : n
        ),
        updatedAt: new Date().toISOString(),
      };
      if (activeId) persist(activeId, messages, updated);
      return updated;
    });
    // Trigger AI to re-evaluate the tree
    sendMessage(`Concluí: "${label}". Atualize a árvore considerando essa conquista — ajuste probabilidades, desbloqueie novos caminhos e sugira próximos passos.`);
  }

  function resetChat() {
    setActiveId(null); setMessages([]); setTree(null);
    setPendingImages([]); setPendingFiles([]); setError(null);
  }

  // Don't render until session checked (avoid login flash)
  if (!authReady) return null;

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const hasPending = pendingImages.length > 0 || pendingFiles.length > 0;
  const convTitle = conversations.find((c) => c.id === activeId)?.title ?? "Chat";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-[220px] shrink-0 border-r border-border">
        <Sidebar
          user={user}
          conversations={conversations}
          folders={folders}
          activeId={activeId}
          onSelect={selectConversation}
          onNew={newConversation}
          onDelete={deleteConversation}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onMove={moveConversation}
          onLogout={handleLogout}
        />
      </div>

      {/* Chat panel */}
      <div className="w-[380px] shrink-0 flex flex-col border-r border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{convTitle}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {messages.length > 0 && (
              <button
                onClick={resetChat}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Novo chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 ? (
            <EmptyState onSelect={sendMessage} />
          ) : (
            messages.map((m) => <ChatBubble key={m.id} message={m} />)
          )}
          {isLoading && <TypingIndicator />}
          {error && (
            <div className="text-[12px] text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment previews */}
        {hasPending && (
          <div className="px-3 pb-1 flex gap-2 flex-wrap">
            {pendingImages.map((img, i) => (
              <div key={`img-${i}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
                <RemoveBtn onClick={() => setPendingImages((p) => p.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            {pendingFiles.map((f, i) => (
              <FileChip
                key={`file-${i}`}
                file={f}
                onRemove={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-end gap-2 bg-secondary rounded-xl px-3 py-2 border border-border focus-within:border-primary/50 transition-colors">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Adicionar arquivo ou imagem"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={handleAttachment}
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva sua situação, envie um arquivo..."
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && !hasPending) || isLoading}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                (input.trim() || hasPending) && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Enter para enviar · Shift+Enter nova linha · 📎 imagens, PDF, código
          </p>
        </div>
      </div>

      {/* Tree panel */}
      <div className="flex-1 relative">
        {tree ? (
          <>
            <div className="absolute top-3 left-3 z-10">
              <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-primary" />
                <span className="text-[12px] font-medium text-foreground">{tree.title}</span>
              </div>
            </div>
            <div className="absolute top-3 right-3 z-10"><Legend /></div>
            <DecisionTree key={tree.updatedAt} tree={tree} onNodeUpdate={handleNodeUpdate} onNodeComplete={handleNodeComplete} />
          </>
        ) : (
          <EmptyTreeState />
        )}
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute -top-1 -right-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center hover:bg-secondary"
    >
      <X className="w-2.5 h-2.5 text-foreground" />
    </button>
  );
}

function FileChip({ file, onRemove }: { file: FileAttachment; onRemove: () => void }) {
  const Icon = fileIcon(file.mimeType) ?? FileText;
  return (
    <div className="relative flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-2 py-1.5 max-w-[140px]">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-foreground truncate">{file.name}</p>
        <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
      </div>
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser ? "bg-primary/20" : "bg-secondary"
      )}>
        {isUser
          ? <User className="w-3 h-3 text-primary" />
          : <Bot className="w-3 h-3 text-muted-foreground" />}
      </div>
      <div className={cn(
        "rounded-xl px-3 py-2 text-[13px] leading-relaxed max-w-[260px] space-y-2",
        isUser
          ? "bg-primary/10 text-foreground border border-primary/20"
          : "bg-secondary text-foreground border border-border"
      )}>
        {message.images && message.images.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {message.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
            ))}
          </div>
        )}
        {message.files && message.files.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {message.files.map((f, i) => {
              const Icon = fileIcon(f.mimeType) ?? FileText;
              return (
                <div key={i} className="flex items-center gap-1.5 bg-background/60 border border-border rounded-lg px-2 py-1">
                  <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[11px] text-foreground truncate max-w-[100px]">{f.name}</span>
                </div>
              );
            })}
          </div>
        )}
        {message.content && <p>{message.content}</p>}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <Bot className="w-3 h-3 text-muted-foreground" />
      </div>
      <div className="bg-secondary border border-border rounded-xl px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (s: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 py-8">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-sm font-semibold text-foreground">Bem-vindo ao QG</h2>
        <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
          Descreva sua situação e objetivos. A IA constrói sua árvore de decisão.
        </p>
      </div>
      <div className="w-full space-y-1.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center mb-2">Exemplos</p>
        {EXAMPLES.map((p, i) => (
          <button
            key={i}
            onClick={() => onSelect(p)}
            className="w-full text-left text-[12px] text-foreground/80 bg-secondary hover:bg-muted border border-border hover:border-primary/30 rounded-lg px-3 py-2 transition-all leading-relaxed"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyTreeState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center border border-border">
        <GitBranch className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Sua árvore aparecerá aqui</h3>
        <p className="text-[12px] text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
          Inicie uma conversa ou envie um arquivo. A IA gera e atualiza sua árvore automaticamente.
        </p>
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-3 flex-wrap">
      {[
        { color: "bg-blue-500", label: "Ativo" },
        { color: "bg-emerald-500", label: "Feito" },
        { color: "bg-amber-500", label: "Oportunidade" },
        { color: "bg-red-500", label: "Bloqueado" },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className={cn("w-2 h-2 rounded-full", item.color)} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
