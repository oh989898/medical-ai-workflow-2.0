import { create } from 'zustand';
import type {
  Node,
  Edge,
  Connection,
  XYPosition
} from '@xyflow/react';
import type {
  NodeDefinition,
  NodeInstance,
  Workflow,
  CodeGenerationResult
} from '@/types/nodes';
import { getNodeDefinition, nodeRegistry } from '@/nodes/registry';

// 连接定义
interface NodeConnection {
  source: string;
  sourceOutput: string;
  target: string;
  targetInput: string;
}

// 工作流状态
interface WorkflowState {
  // 节点和连接
  nodes: Node[];
  edges: Edge[];
  
  // 选中的节点
  selectedNodeId: string | null;
  
  // 历史记录（用于撤销/重做）
  history: { nodes: Node[]; edges: Edge[] }[];
  historyIndex: number;
  
  // 操作
  addNode: (type: string, position: XYPosition) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<Node['data']> & Partial<Pick<Node, 'position'>>) => void;
  updateNodeParameter: (nodeId: string, paramId: string, value: unknown) => void;
  
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;
  
  setSelectedNode: (nodeId: string | null) => void;
  
  // 查询
  getNodeConnections: (nodeId: string) => NodeConnection[];
  getNodeInputs: (nodeId: string) => Record<string, { nodeId: string; outputId: string } | null>;
  
  // 工作流操作
  saveWorkflow: () => Workflow;
  loadWorkflow: (workflow: Workflow) => void;
  clearWorkflow: () => void;
  
  // 代码生成
  generateCode: () => Promise<CodeGenerationResult | null>;
  
  // 历史操作
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

// 生成唯一ID
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  history: [],
  historyIndex: -1,

  // 添加节点
  addNode: (type: string, position: XYPosition) => {
    const definition = getNodeDefinition(type);
    if (!definition) return;

    const newNode: Node = {
      id: generateId(),
      type: 'custom',
      position,
      data: {
        definition,
        parameters: {},
        // 初始化默认参数
        ...definition.parameters.reduce((acc, param) => {
          if (param.defaultValue !== undefined) {
            acc[param.id] = param.defaultValue;
          }
          return acc;
        }, {} as Record<string, unknown>)
      }
    };

    set(state => {
      const newState = {
        nodes: [...state.nodes, newNode],
        edges: state.edges
      };
      return newState;
    });
    
    get().pushHistory();
  },

  // 删除节点
  removeNode: (nodeId: string) => {
    set(state => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId
    }));
    get().pushHistory();
  },

  // 更新节点数据
  updateNode: (nodeId: string, data: Partial<Node['data']> & Partial<Pick<Node, 'position'>>) => {
    set(state => ({
      nodes: state.nodes.map(node => {
        if (node.id !== nodeId) return node;
        
        const update: Node = {
          ...node,
          data: { ...node.data, ...data }
        };
        
        if ('position' in data && data.position) {
          update.position = data.position;
        }
        
        return update;
      })
    }));
  },

  // 更新节点参数
  updateNodeParameter: (nodeId: string, paramId: string, value: unknown) => {
    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                parameters: {
                  ...node.data.parameters,
                  [paramId]: value
                }
              }
            }
          : node
      )
    }));
  },

  // 添加边
  addEdge: (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    const newEdge: Edge = {
      id: `edge_${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || undefined,
      targetHandle: connection.targetHandle || undefined,
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 }
    };

    set(state => ({
      edges: [...state.edges, newEdge]
    }));
    get().pushHistory();
  },

  // 删除边
  removeEdge: (edgeId: string) => {
    set(state => ({
      edges: state.edges.filter(e => e.id !== edgeId)
    }));
    get().pushHistory();
  },

  // 设置选中节点
  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  // 获取节点连接
  getNodeConnections: (nodeId: string): NodeConnection[] => {
    const { edges } = get();
    return edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => ({
        source: e.source,
        sourceOutput: e.sourceHandle || 'output',
        target: e.target,
        targetInput: e.targetHandle || 'input'
      }));
  },

  // 获取节点输入
  getNodeInputs: (nodeId: string): Record<string, { nodeId: string; outputId: string } | null> => {
    const { edges } = get();
    const inputs: Record<string, { nodeId: string; outputId: string } | null> = {};
    
    edges
      .filter(e => e.target === nodeId)
      .forEach(e => {
        const inputId = e.targetHandle || 'input';
        inputs[inputId] = {
          nodeId: e.source,
          outputId: e.sourceHandle || 'output'
        };
      });
    
    return inputs;
  },

  // 保存工作流
  saveWorkflow: (): Workflow => {
    const { nodes, edges } = get();
    const now = new Date().toISOString();
    
    return {
      id: `workflow_${Date.now()}`,
      name: '未命名工作流',
      description: '',
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.data.definition.id,
        position: n.position,
        data: {
          parameters: n.data.parameters,
          inputs: get().getNodeInputs(n.id)
        }
      })),
      connections: edges.map(e => ({
        id: e.id,
        source: e.source,
        sourceOutput: e.sourceHandle || 'output',
        target: e.target,
        targetInput: e.targetHandle || 'input'
      })),
      createdAt: now,
      updatedAt: now
    };
  },

  // 加载工作流
  loadWorkflow: (workflow: Workflow) => {
    const loadedNodes: Node[] = workflow.nodes.map(n => {
      const definition = getNodeDefinition(n.type);
      return {
        id: n.id,
        type: 'custom',
        position: n.position,
        data: {
          definition: definition || nodeRegistry['image_folder'],
          parameters: n.data.parameters
        }
      };
    });

    const loadedEdges: Edge[] = workflow.connections.map(c => ({
      id: c.id,
      source: c.source,
      target: c.target,
      sourceHandle: c.sourceOutput,
      targetHandle: c.targetInput,
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 }
    }));

    set({
      nodes: loadedNodes,
      edges: loadedEdges,
      selectedNodeId: null
    });
    get().pushHistory();
  },

  // 清空工作流
  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null
    });
    get().pushHistory();
  },

  // 生成代码
  generateCode: async (): Promise<CodeGenerationResult | null> => {
    const workflow = get().saveWorkflow();
    
    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('代码生成失败:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        const errorMessage = errorData.detail?.message || errorData.message || `代码生成失败: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error('代码生成错误:', error);
      throw error;
    }
  },

  // 撤销
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      set({
        nodes: state.nodes,
        edges: state.edges,
        historyIndex: newIndex
      });
    }
  },

  // 重做
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      set({
        nodes: state.nodes,
        edges: state.edges,
        historyIndex: newIndex
      });
    }
  },

  // 推入历史
  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    });
    
    // 限制历史记录长度
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  }
}));
