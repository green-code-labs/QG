"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { TreeNodeData, NodeStatus } from "@/types/tree";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Info,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

const STATUS = {
  active: {
    icon: Circle,
    iconColor: "text-blue-500 dark:text-blue-400",
    bg: "bg-[hsl(var(--node-active-bg))]",
    border: "border-[hsl(var(--node-active-border))]",
    dot: "bg-blue-500",
  },
  completed: {
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-[hsl(var(--node-completed-bg))]",
    border: "border-[hsl(var(--node-completed-border))]",
    dot: "bg-emerald-500",
  },
  blocked: {
    icon: AlertCircle,
    iconColor: "text-red-600 dark:text-red-400",
    bg: "bg-[hsl(var(--node-blocked-bg))]",
    border: "border-[hsl(var(--node-blocked-border))]",
    dot: "bg-red-500",
  },
  opportunity: {
    icon: Sparkles,
    iconColor: "text-amber-600 dark:text-amber-400",
    bg: "bg-[hsl(var(--node-opportunity-bg))]",
    border: "border-[hsl(var(--node-opportunity-border))]",
    dot: "bg-amber-500",
  },
} satisfies Record<NodeStatus, { icon: React.ElementType; iconColor: string; bg: string; border: string; dot: string }>;

const PROB_COLOR = (p: number) =>
  p >= 70 ? "text-emerald-600 dark:text-emerald-400" : p >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

export const TreeNode = memo(({ data, selected }: NodeProps<TreeNodeData>) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label);
  const [editDesc, setEditDesc] = useState(data.description ?? "");
  const [editActions, setEditActions] = useState<string[]>(data.actions ?? []);
  const [editProb, setEditProb] = useState(data.probability ?? 0);
  const [editTimeframe, setEditTimeframe] = useState(data.timeframe ?? "");
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditLabel(data.label);
      setEditDesc(data.description ?? "");
      setEditActions(data.actions ?? []);
      setEditProb(data.probability ?? 0);
      setEditTimeframe(data.timeframe ?? "");
      setTimeout(() => labelRef.current?.focus(), 50);
    }
  }, [editing, data]);

  const cfg = STATUS[data.status] ?? STATUS.active;
  const Icon = cfg.icon;

  function saveEdits() {
    data.onUpdate?.(data.id, {
      label: editLabel.trim() || data.label,
      description: editDesc.trim() || undefined,
      actions: editActions.filter(Boolean),
      probability: editProb,
      timeframe: editTimeframe.trim() || undefined,
    });
    setEditing(false);
  }

  function cancelEdits() {
    setEditing(false);
  }

  function updateAction(i: number, value: string) {
    setEditActions((prev) => prev.map((a, idx) => (idx === i ? value : a)));
  }

  function removeAction(i: number) {
    setEditActions((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (editing) {
    return (
      <div
        className={cn(
          "rounded-xl border shadow-lg w-[280px] bg-card border-primary/50 ring-2 ring-primary/30",
          "animate-fade-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Handle type="target" position={Position.Left} className="!opacity-0" />
        <Handle type="source" position={Position.Right} className="!opacity-0" />

        <div className="p-3 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Editar nó</span>
            <div className="flex gap-1">
              <button onClick={saveEdits} className="p-1 rounded hover:bg-primary/10 text-primary">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={cancelEdits} className="p-1 rounded hover:bg-secondary text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <input
            ref={labelRef}
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="w-full text-[13px] font-semibold bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground outline-none focus:border-primary/50"
            placeholder="Título"
          />

          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
            className="w-full text-[12px] bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground outline-none focus:border-primary/50 resize-none"
            placeholder="Descrição (opcional)"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Probabilidade %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={editProb}
                onChange={(e) => setEditProb(Number(e.target.value))}
                className="w-full text-[12px] bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Prazo</label>
              <input
                value={editTimeframe}
                onChange={(e) => setEditTimeframe(e.target.value)}
                className="w-full text-[12px] bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground outline-none focus:border-primary/50"
                placeholder="ex: 6 meses"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Próximos passos</label>
            <div className="space-y-1">
              {editActions.map((action, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={action}
                    onChange={(e) => updateAction(i, e.target.value)}
                    className="flex-1 text-[12px] bg-secondary border border-border rounded-md px-2 py-1 text-foreground outline-none focus:border-primary/50"
                    placeholder={`Passo ${i + 1}`}
                  />
                  <button onClick={() => removeAction(i)} className="p-1 text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditActions((p) => [...p, ""])}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 mt-1"
              >
                <Plus className="w-3 h-3" /> Adicionar passo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      <div
        className={cn(
          "relative group rounded-xl border shadow-md transition-all duration-200 w-[240px]",
          cfg.bg,
          cfg.border,
          selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
          data.isRoot && "ring-1 ring-primary/30"
        )}
      >
        <Handle type="target" position={Position.Left} className="!bg-border !border-none !w-1.5 !h-1.5" />
        <Handle type="source" position={Position.Right} className="!bg-border !border-none !w-1.5 !h-1.5" />

        {/* Complete button */}
        <button
          className={cn(
            "absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all z-10 shadow-sm",
            data.status === "completed"
              ? "bg-emerald-500 border-emerald-500 opacity-100"
              : "bg-background border-border opacity-0 group-hover:opacity-100 hover:border-emerald-400"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (data.status !== "completed") {
              data.onComplete?.(data.id, data.label);
            }
          }}
          title={data.status === "completed" ? "Concluído" : "Marcar como concluído"}
        >
          {data.status === "completed" && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Edit button */}
        <button
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-background/50 hover:bg-background border border-border/50 z-10"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); setEditing(true); }}
          title="Editar nó"
        >
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </button>

        <div className="p-3">
          {/* Header */}
          <div className="flex items-start gap-2 pr-6">
            <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", cfg.iconColor)} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground leading-snug break-words">
                {data.label}
              </p>
              {data.timeframe && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{data.timeframe}</p>
              )}
            </div>
          </div>

          {/* Probability */}
          {data.probability !== undefined && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
              <span className="text-[10px] text-muted-foreground">Probabilidade</span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className="flex items-center gap-1 cursor-help">
                    <span className={cn("text-[13px] font-bold tabular-nums", PROB_COLOR(data.probability))}>
                      {data.probability}%
                    </span>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    align="end"
                    sideOffset={6}
                    className="z-50 max-w-[220px] rounded-lg bg-card border border-border shadow-lg px-3 py-2 text-[11px] text-foreground leading-relaxed animate-fade-in"
                  >
                    <p className="font-semibold text-muted-foreground mb-1 text-[10px] uppercase tracking-wider">Lógica do cálculo</p>
                    <p>{data.probabilityReasoning ?? "Baseado no contexto atual fornecido."}</p>
                    <Tooltip.Arrow className="fill-border" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          )}

          {/* Expand toggle */}
          {(data.description || (data.actions && data.actions.length > 0)) && (
            <button
              className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Menos" : "Detalhes"}
            </button>
          )}

          {/* Expanded */}
          {expanded && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {data.description && (
                <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
                  {data.description}
                </p>
              )}
              {data.actions && data.actions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider mb-1">
                    Próximos passos
                  </p>
                  <ul className="space-y-0.5">
                    {data.actions.map((action, i) => (
                      <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5 break-words">
                        <span className="text-primary mt-0.5 shrink-0">›</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
});

TreeNode.displayName = "TreeNode";
