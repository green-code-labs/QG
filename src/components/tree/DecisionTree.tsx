"use client";

import { useCallback, useMemo, useEffect } from "react";
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
import { LifeTree, TreeNodeData } from "@/types/tree";
import { buildFlowElements } from "@/lib/treeLayout";
import { TreeNode } from "./TreeNode";

const nodeTypes = { treeNode: TreeNode };

interface Props {
  tree: LifeTree;
  onNodeUpdate: (nodeId: string, data: Partial<TreeNodeData>) => void;
}

export function DecisionTree({ tree, onNodeUpdate }: Props) {
  const { flowNodes: initialNodes, flowEdges: initialEdges } = useMemo(
    () => buildFlowElements(tree.nodes, tree.edges, onNodeUpdate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tree.updatedAt]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { flowNodes, flowEdges } = buildFlowElements(tree.nodes, tree.edges, onNodeUpdate);
    setNodes(flowNodes);
    setEdges(flowEdges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.updatedAt]);

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
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(n) => {
          const s = n.data?.status;
          if (s === "completed") return "#10b981";
          if (s === "blocked") return "#ef4444";
          if (s === "opportunity") return "#f59e0b";
          return "#3b82f6";
        }}
        maskColor="rgba(128,128,128,0.1)"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      />
    </ReactFlow>
  );
}
