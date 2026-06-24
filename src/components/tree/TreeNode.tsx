"use client";

import { memo, useState } from "react";
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
} from "lucide-react";

const statusConfig: Record<
  NodeStatus,
  { icon: React.ElementType; color: string; bg: string; border: string }
> = {
  active: {
    icon: Circle,
    color: "text-blue-400",
    bg: "bg-blue-950/40",
    border: "border-blue-800/50",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-950/40",
    border: "border-emerald-800/50",
  },
  blocked: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-950/40",
    border: "border-red-800/50",
  },
  opportunity: {
    icon: Sparkles,
    color: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-800/50",
  },
};

export const TreeNode = memo(({ data, selected }: NodeProps<TreeNodeData>) => {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[data.status] ?? statusConfig.active;
  const Icon = config.icon;

  const prob = data.probability;
  const probColor =
    prob === undefined
      ? ""
      : prob >= 70
      ? "text-emerald-400"
      : prob >= 40
      ? "text-amber-400"
      : "text-red-400";

  return (
    <div
      className={cn(
        "relative rounded-xl border px-4 py-3 shadow-lg transition-all duration-200 cursor-pointer min-w-[200px] max-w-[240px]",
        config.bg,
        config.border,
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        data.isRoot && "ring-1 ring-primary/40"
      )}
      onClick={() => setExpanded((e) => !e)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-border !border-none !w-1.5 !h-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-border !border-none !w-1.5 !h-1.5"
      />

      {/* Header */}
      <div className="flex items-start gap-2">
        <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
            {data.label}
          </p>
          {data.timeframe && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {data.timeframe}
            </p>
          )}
        </div>
        {prob !== undefined && (
          <span className={cn("text-[11px] font-bold tabular-nums shrink-0", probColor)}>
            {prob}%
          </span>
        )}
      </div>

      {/* Expand toggle */}
      {(data.description || (data.actions && data.actions.length > 0)) && (
        <button
          className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          {expanded ? "Menos" : "Mais detalhes"}
        </button>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {data.description && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          )}
          {data.actions && data.actions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider mb-1">
                Próximos passos
              </p>
              <ul className="space-y-0.5">
                {data.actions.map((action, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-foreground/80 flex items-start gap-1"
                  >
                    <span className="text-primary mt-0.5">›</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TreeNode.displayName = "TreeNode";
