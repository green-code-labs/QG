import { TreeNodeData } from "@/types/tree";
import { Node, Edge, MarkerType } from "reactflow";

const HORIZONTAL_GAP = 280;
const VERTICAL_GAP = 160;

export function buildFlowElements(
  nodes: TreeNodeData[],
  edges: Array<{ id: string; source: string; target: string; data?: { label?: string; weight?: number } }>
): { flowNodes: Node[]; flowEdges: Edge[] } {
  // Build adjacency for layout
  const children: Record<string, string[]> = {};
  const parents: Record<string, string[]> = {};

  for (const n of nodes) {
    children[n.id] = [];
    parents[n.id] = [];
  }
  for (const e of edges) {
    children[e.source]?.push(e.target);
    parents[e.target]?.push(e.source);
  }

  const root = nodes.find((n) => n.isRoot) ?? nodes[0];
  if (!root) return { flowNodes: [], flowEdges: [] };

  // BFS to assign depth and breadth positions
  const positions: Record<string, { x: number; y: number }> = {};
  const depthMap: Record<string, number> = {};
  const queue: string[] = [root.id];
  depthMap[root.id] = 0;

  while (queue.length) {
    const id = queue.shift()!;
    for (const child of children[id] ?? []) {
      if (depthMap[child] === undefined) {
        depthMap[child] = depthMap[id] + 1;
        queue.push(child);
      }
    }
  }

  // Group nodes by depth
  const byDepth: Record<number, string[]> = {};
  for (const [id, depth] of Object.entries(depthMap)) {
    (byDepth[depth] ??= []).push(id);
  }

  // Assign positions
  for (const [depthStr, ids] of Object.entries(byDepth)) {
    const depth = Number(depthStr);
    const total = ids.length;
    ids.forEach((id, i) => {
      positions[id] = {
        x: depth * HORIZONTAL_GAP,
        y: (i - (total - 1) / 2) * VERTICAL_GAP,
      };
    });
  }

  const flowNodes: Node[] = nodes.map((n) => ({
    id: n.id,
    type: "treeNode",
    position: positions[n.id] ?? { x: 0, y: 0 },
    data: n,
  }));

  const flowEdges: Edge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    label: e.data?.label,
    animated: false,
    style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
    labelStyle: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
    labelBgStyle: { fill: "hsl(var(--card))" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--border))" },
  }));

  return { flowNodes, flowEdges };
}
