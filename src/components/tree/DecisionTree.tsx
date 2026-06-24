"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { LifeTree } from "@/types/tree";
import { buildFlowElements } from "@/lib/treeLayout";
import { TreeNode } from "./TreeNode";

const nodeTypes = { treeNode: TreeNode };

interface Props {
  tree: LifeTree;
}

export function DecisionTree({ tree }: Props) {
  const { flowNodes: initialNodes, flowEdges: initialEdges } = useMemo(
    () => buildFlowElements(tree.nodes, tree.edges),
    [tree]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      attributionPosition="bottom-right"
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="hsl(var(--border))"
      />
      <Controls
        className="!bg-card !border-border"
        showInteractive={false}
      />
      <MiniMap
        nodeColor={(n) => {
          const status = n.data?.status;
          if (status === "completed") return "#10b981";
          if (status === "blocked") return "#ef4444";
          if (status === "opportunity") return "#f59e0b";
          return "#3b82f6";
        }}
        maskColor="rgba(0,0,0,0.4)"
      />
    </ReactFlow>
  );
}
