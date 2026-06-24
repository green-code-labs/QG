export type NodeStatus = "active" | "completed" | "blocked" | "opportunity";

export interface TreeNodeData {
  id: string;
  label: string;
  description?: string;
  probability?: number;
  probabilityReasoning?: string;
  timeframe?: string;
  actions?: string[];
  status: NodeStatus;
  isRoot?: boolean;
  onUpdate?: (id: string, data: Partial<TreeNodeData>) => void;
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
  images?: string[];
  timestamp: string;
}

export interface Folder {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  folderId?: string;
  messages: Message[];
  tree?: LifeTree;
  createdAt: string;
  updatedAt: string;
}
