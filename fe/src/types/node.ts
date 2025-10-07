export interface NetworkNode {
  id: string;
  name: string;
  description?: string;
}

export interface NetworkNodeData {
  node: NetworkNode;
  onNameChange: (name: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export type ConnectionType = "one-way" | "two-way";
