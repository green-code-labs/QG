"use client";

import { useState, useRef, useEffect } from "react";
import { Message, LifeTree } from "@/types/tree";
import { DecisionTree } from "@/components/tree/DecisionTree";
import { cn } from "@/lib/utils";
import {
  Send,
  Loader2,
  GitBranch,
  Sparkles,
  RotateCcw,
  User,
  Bot,
} from "lucide-react";

const PLACEHOLDER_PROMPTS = [
  "Sou dev com 3 anos de exp. Quero entrar em IA ou empreender. Me ajude a mapear os caminhos.",
  "Acabei de receber uma proposta de emprego melhor. Como isso muda minha árvore?",
  "Quero ser freelancer em 1 ano. Quais são meus próximos passos?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [tree, setTree] = useState<LifeTree | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentTree: tree,
        }),
      });

      if (!res.ok) throw new Error("Erro na resposta da API");

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message ?? "Árvore atualizada.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.tree) {
        setTree({
          ...data.tree,
          updatedAt: new Date().toISOString(),
        });
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

  function reset() {
    setMessages([]);
    setTree(null);
    setError(null);
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Panel — Chat */}
      <div className="w-[400px] shrink-0 flex flex-col border-r border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">QG</h1>
              <p className="text-[10px] text-muted-foreground">
                Planejador de Vida
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
            >
              <RotateCcw className="w-3 h-3" />
              Reiniciar
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <EmptyState onSelect={sendMessage} />
          ) : (
            messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))
          )}
          {isLoading && <TypingIndicator />}
          {error && (
            <div className="text-[12px] text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-end gap-2 bg-secondary rounded-xl px-3 py-2 border border-border focus-within:border-primary/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva sua situação ou uma nova oportunidade..."
              rows={1}
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                input.trim() && !isLoading
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
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Enter para enviar · Shift+Enter para quebrar linha
          </p>
        </div>
      </div>

      {/* Right Panel — Tree */}
      <div className="flex-1 relative">
        {tree ? (
          <>
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-primary" />
                <span className="text-[12px] font-medium text-foreground">
                  {tree.title}
                </span>
              </div>
              <Legend />
            </div>
            <DecisionTree key={tree.updatedAt} tree={tree} />
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
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
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
          "rounded-xl px-3 py-2 text-[13px] leading-relaxed max-w-[280px]",
          isUser
            ? "bg-primary/15 text-foreground border border-primary/20"
            : "bg-secondary text-foreground border border-border"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-secondary">
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
    <div className="h-full flex flex-col items-center justify-center gap-5 py-10">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-sm font-semibold text-foreground">
          Bem-vindo ao QG
        </h2>
        <p className="text-[12px] text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
          Descreva sua situação atual e seus objetivos. A IA vai construir sua
          árvore de decisão personalizada.
        </p>
      </div>
      <div className="w-full space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">
          Exemplos para começar
        </p>
        {PLACEHOLDER_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt)}
            className="w-full text-left text-[12px] text-foreground/80 bg-secondary hover:bg-secondary/80 border border-border hover:border-primary/40 rounded-lg px-3 py-2.5 transition-all leading-relaxed"
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
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center border border-border">
        <GitBranch className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Sua árvore aparecerá aqui
        </h3>
        <p className="text-[12px] text-muted-foreground mt-1 max-w-[300px] leading-relaxed">
          Inicie uma conversa no painel esquerdo. A IA vai gerar e atualizar sua
          árvore de decisão automaticamente.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-2 w-full max-w-xs">
        {[
          { color: "bg-blue-400", label: "Ativo" },
          { color: "bg-emerald-400", label: "Concluído" },
          { color: "bg-amber-400", label: "Oportunidade" },
          { color: "bg-red-400", label: "Bloqueado" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className={cn("w-2 h-2 rounded-full", item.color)} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-3">
      {[
        { color: "bg-blue-400", label: "Ativo" },
        { color: "bg-emerald-400", label: "Feito" },
        { color: "bg-amber-400", label: "Oportunidade" },
        { color: "bg-red-400", label: "Bloqueado" },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className={cn("w-2 h-2 rounded-full", item.color)} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
