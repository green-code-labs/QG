"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Message, LifeTree, TreeNodeData, Conversation, Folder } from "@/types/tree";
import { DecisionTree } from "@/components/tree/DecisionTree";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  Send,
  Loader2,
  GitBranch,
  Sparkles,
  RotateCcw,
  User,
  Bot,
  Image as ImageIcon,
  X,
} from "lucide-react";

const PLACEHOLDER_PROMPTS = [
  "Sou dev com 3 anos de exp. Quero entrar em IA ou empreender. Me ajude a mapear os caminhos.",
  "Acabei de receber uma proposta de emprego melhor. Como isso muda minha árvore?",
  "Quero ser freelancer em 1 ano. Quais são meus próximos passos?",
];

const SAVE_DEBOUNCE_MS = 1500;

export default function Home() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;

  // Sidebar state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [tree, setTree] = useState<LifeTree | null>(null);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load sidebar data on login
  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch("/api/folders").then((r) => r.json()),
      fetch("/api/conversations").then((r) => r.json()),
    ]).then(([foldersData, convosData]) => {
      setFolders(Array.isArray(foldersData) ? foldersData : []);
      setConversations(Array.isArray(convosData) ? convosData : []);
    });
  }, [userId]);

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

  // Auto-save conversation
  const saveConversation = useCallback(
    (convId: string, msgs: Message[], t: LifeTree | null, title?: string) => {
      if (!userId || !convId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/conversations/${convId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: msgs, tree: t, title }),
        })
          .then((r) => r.json())
          .then((updated) => {
            setConversations((prev) =>
              prev.map((c) => (c.id === convId ? { ...c, ...updated } : c))
            );
          });
      }, SAVE_DEBOUNCE_MS);
    },
    [userId]
  );

  async function selectConversation(id: string) {
    setActiveConvId(id);
    const res = await fetch(`/api/conversations/${id}`);
    const data: Conversation = await res.json();
    setMessages(data.messages ?? []);
    setTree(data.tree ?? null);
    setPendingImages([]);
    setError(null);
  }

  async function newConversation(folderId?: string) {
    if (!userId) {
      // Local mode: just reset
      setActiveConvId(null);
      setMessages([]);
      setTree(null);
      setPendingImages([]);
      return;
    }
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nova conversa", folderId }),
    });
    const convo: Conversation = await res.json();
    setConversations((prev) => [convo, ...prev]);
    setActiveConvId(convo.id);
    setMessages([]);
    setTree(null);
    setPendingImages([]);
    setError(null);
  }

  async function deleteConversation(id: string) {
    if (!userId) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
      setTree(null);
    }
  }

  async function createFolder(name: string, emoji: string) {
    if (!userId) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, emoji }),
    });
    const folder: Folder = await res.json();
    setFolders((prev) => [...prev, folder]);
  }

  async function deleteFolder(id: string) {
    if (!userId) return;
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setConversations((prev) =>
      prev.map((c) => (c.folderId === id ? { ...c, folderId: undefined } : c))
    );
  }

  async function moveConversation(convId: string, folderId?: string) {
    if (!userId) return;
    await fetch(`/api/conversations/${convId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: folderId ?? null }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, folderId } : c))
    );
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPendingImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendMessage(content: string) {
    if ((!content.trim() && pendingImages.length === 0) || isLoading) return;

    // Create conversation on first message if not exists
    let convId = activeConvId;
    if (!convId && userId) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: content.slice(0, 50) || "Nova conversa" }),
      });
      const convo: Conversation = await res.json();
      setConversations((prev) => [convo, ...prev]);
      setActiveConvId(convo.id);
      convId = convo.id;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingImages([]);
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
      const finalTree = data.tree
        ? { ...data.tree, updatedAt: new Date().toISOString() }
        : tree;

      setMessages(finalMessages);
      if (data.tree) setTree(finalTree);

      // Auto-save
      if (convId) {
        const title =
          finalMessages.find((m) => m.role === "user")?.content.slice(0, 60) ??
          "Conversa";
        saveConversation(convId, finalMessages, finalTree, title);
      }
    } catch (e) {
      setError("Algo deu errado. Tente novamente.");
      console.error(e);
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

  function resetChat() {
    setActiveConvId(null);
    setMessages([]);
    setTree(null);
    setPendingImages([]);
    setError(null);
  }

  function handleNodeUpdate(nodeId: string, data: Partial<TreeNodeData>) {
    setTree((prev) => {
      if (!prev) return prev;
      const updated: LifeTree = {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, ...data } : n)),
        updatedAt: new Date().toISOString(),
      };
      if (activeConvId) saveConversation(activeConvId, messages, updated);
      return updated;
    });
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-[220px] shrink-0 border-r border-border flex flex-col">
        <Sidebar
          conversations={conversations}
          folders={folders}
          activeId={activeConvId}
          onSelect={selectConversation}
          onNewConversation={newConversation}
          onDeleteConversation={deleteConversation}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onMoveConversation={moveConversation}
        />
      </div>

      {/* Chat Panel */}
      <div className="w-[380px] shrink-0 flex flex-col border-r border-border">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {conversations.find((c) => c.id === activeConvId)?.title ?? "Chat"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {messages.length > 0 && (
              <button
                onClick={resetChat}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Nova conversa"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 ? (
            <EmptyState onSelect={sendMessage} />
          ) : (
            messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
          )}
          {isLoading && <TypingIndicator />}
          {error && (
            <div className="text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image previews */}
        {pendingImages.length > 0 && (
          <div className="px-3 flex gap-2 flex-wrap pb-1">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
                <button
                  onClick={() => setPendingImages((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-end gap-2 bg-secondary rounded-xl px-3 py-2 border border-border focus-within:border-primary/50 transition-colors">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Adicionar imagem"
              disabled={isLoading}
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva sua situação ou nova oportunidade..."
              rows={1}
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                (input.trim() || pendingImages.length > 0) && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-center">
            Enter para enviar · Shift+Enter nova linha · 📎 imagens suportadas
          </p>
        </div>
      </div>

      {/* Tree Panel */}
      <div className="flex-1 relative">
        {tree ? (
          <>
            <div className="absolute top-3 left-3 z-10">
              <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-primary" />
                <span className="text-[12px] font-medium text-foreground">{tree.title}</span>
              </div>
            </div>
            <div className="absolute top-3 right-3 z-10">
              <Legend />
            </div>
            <DecisionTree
              key={tree.updatedAt}
              tree={tree}
              onNodeUpdate={handleNodeUpdate}
            />
          </>
        ) : (
          <EmptyTreeState />
        )}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser ? "bg-primary/20" : "bg-secondary"
        )}
      >
        {isUser ? (
          <User className="w-3 h-3 text-primary" />
        ) : (
          <Bot className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
      <div
        className={cn(
          "rounded-xl px-3 py-2 text-[13px] leading-relaxed max-w-[260px] space-y-1.5",
          isUser
            ? "bg-primary/10 text-foreground border border-primary/20"
            : "bg-secondary text-foreground border border-border"
        )}
      >
        {message.images && message.images.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {message.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
            ))}
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
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center mb-2">
          Exemplos
        </p>
        {PLACEHOLDER_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt)}
            className="w-full text-left text-[12px] text-foreground/80 bg-secondary hover:bg-muted border border-border hover:border-primary/30 rounded-lg px-3 py-2 transition-all leading-relaxed"
          >
            {prompt}
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
          Inicie uma conversa. A IA gera e atualiza sua árvore de decisão automaticamente.
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
