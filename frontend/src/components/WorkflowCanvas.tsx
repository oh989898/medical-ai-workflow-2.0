import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type XYPosition,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Download, Trash2, Undo, Redo, Code 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { nodeTypes } from '@/nodes';
import { useWorkflowStore } from '@/stores/workflowStore';
import { isTypeCompatible } from '@/types/nodes';
import { getNodeDefinition } from '@/nodes/registry';
import type { CodeGenerationResult, NodeDefinition, InputPort, OutputPort } from '@/types/nodes';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 工具栏按钮 - Apple 风格
function ToolbarButton({ 
  onClick, 
  icon: Icon, 
  label, 
  disabled = false,
  variant = 'default'
}: { 
  onClick: () => void; 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}) {
  const variants = {
    default: 'bg-white/80 hover:bg-white text-gray-700 border-gray-200/50 shadow-sm hover:shadow-md',
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-transparent shadow-lg shadow-blue-500/25',
    danger: 'bg-red-50/80 hover:bg-red-50 text-red-600 border-red-200/50 hover:border-red-300'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-200',
        variants[variant],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

// 代码预览弹窗
function CodePreviewModal({ 
  code, 
  onClose 
}: { 
  code: CodeGenerationResult | null; 
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<keyof CodeGenerationResult>('main_py');
  
  if (!code) return null;

  const tabs: { key: keyof CodeGenerationResult; label: string }[] = [
    { key: 'main_py', label: 'main.py' },
    { key: 'model_py', label: 'model.py' },
    { key: 'dataset_py', label: 'dataset.py' },
    { key: 'config_yaml', label: 'config.yaml' },
    { key: 'requirements_txt', label: 'requirements.txt' },
  ];

  const downloadCode = () => {
    const blob = new Blob([code[activeTab]], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tabs.find(t => t.key === activeTab)?.label || 'code.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[900px] max-w-[90vw] max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Code className="w-5 h-5" />
            生成的代码
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCode}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              下载
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 代码内容 */}
        <div className="flex-1 overflow-auto p-4 bg-gray-900">
          <pre className="text-sm text-gray-100 font-mono whitespace-pre">
            {code[activeTab]}
          </pre>
        </div>
      </div>
    </div>
  );
}

// 画布内容组件
function CanvasContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<CodeGenerationResult | null>(null);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  
  const {
    nodes,
    edges,
    addNode,
    removeNode,
    addEdge: addWorkflowEdge,
    removeEdge,
    setSelectedNode,
    updateNode,
    undo,
    redo,
    clearWorkflow,
    generateCode
  } = useWorkflowStore();

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(edges);

  // 同步状态
  useEffect(() => {
    setReactFlowNodes(nodes);
  }, [nodes, setReactFlowNodes]);

  useEffect(() => {
    setReactFlowEdges(edges);
  }, [edges, setReactFlowEdges]);

  const onNodesChangeWrapped = useCallback((changes: any) => {
    onNodesChange(changes);
    changes.forEach((change: any) => {
      if (change.type === 'remove') {
        removeNode(change.id);
      } else if (change.type === 'position' && change.position) {
        updateNode(change.id, { position: change.position });
      }
    });
  }, [onNodesChange, removeNode, updateNode]);

  const onEdgesChangeWrapped = useCallback((changes: any) => {
    onEdgesChange(changes);
    changes.forEach((change: any) => {
      if (change.type === 'remove') {
        removeEdge(change.id);
      }
    });
  }, [onEdgesChange, removeEdge]);

  // 拖拽开始
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedNodeType(nodeType);
  };

  // 拖拽经过
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 放置
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
      setDraggedNodeType(null);
    },
    [screenToFlowPosition, addNode]
  );

  // 连接验证
  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;
    
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return false;
    
    const sourceDef = sourceNode.data.definition as NodeDefinition;
    const targetDef = targetNode.data.definition as NodeDefinition;
    
    const sourceOutput = sourceDef.outputs.find((o: OutputPort) => o.id === connection.sourceHandle);
    const targetInput = targetDef.inputs.find((i: InputPort) => i.id === connection.targetHandle);
    
    if (!sourceOutput || !targetInput) return false;
    
    return isTypeCompatible(sourceOutput.type, targetInput.type);
  }, [nodes]);

  const onConnect = useCallback((connection: Connection) => {
    if (isValidConnection(connection)) {
      addWorkflowEdge(connection);
      setReactFlowEdges((eds) => addEdge({
        ...connection,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }, eds));
    }
  }, [isValidConnection, addWorkflowEdge, setReactFlowEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleGenerateCode = async () => {
    try {
      const code = await generateCode();
      if (code) {
        setGeneratedCode(code);
        setShowCodeModal(true);
      }
    } catch (error) {
      console.error('生成代码失败:', error);
      alert('代码生成失败，请查看控制台了解详细信息');
    }
  };

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full relative">
      <div 
        className="w-full h-full"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChangeWrapped}
          onEdgesChange={onEdgesChangeWrapped}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          attributionPosition="bottom-right"
          deleteKeyCode={['Backspace', 'Delete']}
          selectionKeyCode={['Shift']}
          multiSelectionKeyCode={['Control', 'Meta']}
          zoomActivationKeyCode={['Control', 'Meta']}
        >
          <Background color="#94a3b8" gap={20} size={1} />
          <Controls className="bg-white shadow-lg rounded-lg" />
          <MiniMap 
            className="bg-white shadow-lg rounded-lg"
            nodeStrokeWidth={3}
            zoomable
            pannable
          />
          
          {/* 顶部工具栏 - Apple 风格玻璃态 */}
          <Panel position="top-center" className="m-4">
            <div className="flex items-center gap-2 glass-panel px-4 py-3 rounded-2xl shadow-xl shadow-black/5">
              <ToolbarButton
                onClick={undo}
                icon={Undo}
                label="撤销"
              />
              <ToolbarButton
                onClick={redo}
                icon={Redo}
                label="重做"
              />
              <div className="w-px h-8 bg-gray-200/60 mx-1" />
              <ToolbarButton
                onClick={clearWorkflow}
                icon={Trash2}
                label="清空"
                variant="danger"
              />
              <ToolbarButton
                onClick={handleGenerateCode}
                icon={Code}
                label="生成代码"
                variant="primary"
              />
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* 代码预览弹窗 */}
      {showCodeModal && (
        <CodePreviewModal
          code={generatedCode}
          onClose={() => setShowCodeModal(false)}
        />
      )}
    </div>
  );
}

// 主画布组件
export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}

export default WorkflowCanvas;
