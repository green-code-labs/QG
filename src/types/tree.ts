export type NodeStatus = "active" | "completed" | "blocked" | "opportunity";

export interface TreeNodeData {
  id: string;
  label: string;
  description?: string;
  probability?: number; // 0-100
  timeframe?: string;
  actions?: string[];
  status: NodeStatus;
  isRoot?: boolean;
  scenarioType?: "conservative" | "aggressive" | "pivot" | "pessimistic";
}

export interface TreeEdgeData {
  label?: string;
  weight?: number;
}

export interface LifeTree {
  id: string;
  title: string;
  nodes: TreeNodeData[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    data?: TreeEdgeData;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatState {
  messages: Message[];
  tree: LifeTree | null;
  isLoading: boolean;
}
