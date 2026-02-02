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
  Download, Trash2, Undo, Redo, Code, Sparkles 
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
    default: 'bg-white/40 hover:bg-white/80 text-gray-700 border-gray-200/30',
    primary: 'bg-blue-500/90 hover:bg-blue-600 text-white border-transparent shadow-lg shadow-blue-500/20',
    danger: 'bg-red-50/50 hover:bg-red-100 text-red-600 border-red-200/30'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex items-center justify-center gap-2 p-2 px-3 rounded-xl border text-sm font-medium transition-all duration-300',
        variants[variant],
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100">
        {label}
      </span>
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
    generateCode,
    loadWorkflow
  } = useWorkflowStore();

  const loadClassificationTemplate = () => {
    const now = new Date().toISOString();
    const template: any = {
      id: 'template_classification',
      name: '病理图像分类模板',
      nodes: [
        { id: 'n1', type: 'image_folder', position: { x: 50, y: 150 }, data: { parameters: { folder_path: '/path/to/data' } } },
        { id: 'n2', type: 'resize', position: { x: 300, y: 150 }, data: { parameters: { size: 224 } } },
        { id: 'n3', type: 'titan', position: { x: 550, y: 150 }, data: { parameters: { model_path: '/path/to/titan.pth' } } },
        { id: 'n4', type: 'classifier', position: { x: 800, y: 150 }, data: { parameters: { num_classes: 2 } } },
        { id: 'n5', type: 'training_config', position: { x: 50, y: 350 }, data: { parameters: { epochs: 50, batch_size: 32 } } }
      ],
      connections: [
        { id: 'e1', source: 'n1', sourceOutput: 'images', target: 'n2', targetInput: 'input' },
        { id: 'e2', source: 'n2', sourceOutput: 'output', target: 'n3', targetInput: 'input' },
        { id: 'e3', source: 'n3', sourceOutput: 'features', target: 'n4', targetInput: 'features' }
      ],
      createdAt: now,
      updatedAt: now
    };
    loadWorkflow(template);
  };

  const loadSegmentationTemplate = () => {
    const now = new Date().toISOString();
    const template: any = {
      id: 'template_segmentation',
      name: '图像分割模板',
      nodes: [
        { id: 'n1', type: 'segmentation_dataset', position: { x: 50, y: 150 }, data: { parameters: { images_path: '/path/to/images', masks_path: '/path/to/masks' } } },
        { id: 'n2', type: 'resnet50', position: { x: 350, y: 150 }, data: { parameters: { pretrained: true } } },
        { id: 'n3', type: 'segmentation_head', position: { x: 650, y: 150 }, data: { parameters: { num_classes: 2, decoder_type: 'unet' } } },
        { id: 'n4', type: 'training_config', position: { x: 50, y: 350 }, data: { parameters: { epochs: 100, batch_size: 16 } } }
      ],
      connections: [
        { id: 'e1', source: 'n1', sourceOutput: 'images', target: 'n2', targetInput: 'input' },
        { id: 'e2', source: 'n2', sourceOutput: 'feature_map', target: 'n3', targetInput: 'features' },
        { id: 'e3', source: 'n1', sourceOutput: 'masks', target: 'n3', targetInput: 'masks' }
      ],
      createdAt: now,
      updatedAt: now
    };
    loadWorkflow(template);
  };

  const loadMultimodalTemplate = () => {
    const now = new Date().toISOString();
    const template: any = {
      id: 'template_multimodal',
      name: '多模态特征融合模板',
      nodes: [
        { id: 'n1', type: 'image_folder', position: { x: 50, y: 100 }, data: { parameters: { folder_path: '/path/to/images' } } },
        { id: 'n2', type: 'resnet50', position: { x: 300, y: 100 }, data: { parameters: { pretrained: true } } },
        { id: 'n3', type: 'clinical_csv', position: { x: 50, y: 300 }, data: { parameters: { csv_path: '/path/to/data.csv' } } },
        { id: 'n4', type: 'gated_fusion', position: { x: 550, y: 200 }, data: { parameters: { gate_type: 'sigmoid' } } },
        { id: 'n5', type: 'classifier', position: { x: 800, y: 200 }, data: { parameters: { num_classes: 2 } } },
        { id: 'n6', type: 'training_config', position: { x: 50, y: 450 }, data: { parameters: { epochs: 100, batch_size: 32 } } }
      ],
      connections: [
        { id: 'e1', source: 'n1', sourceOutput: 'images', target: 'n2', targetInput: 'input' },
        { id: 'e2', source: 'n2', sourceOutput: 'features', target: 'n4', targetInput: 'input1' },
        { id: 'e3', source: 'n3', sourceOutput: 'features', target: 'n4', targetInput: 'input2' },
        { id: 'e4', source: 'n4', sourceOutput: 'output', target: 'n5', targetInput: 'features' }
      ],
      createdAt: now,
      updatedAt: now
    };
    loadWorkflow(template);
  };

  const loadVisionLanguageTemplate = () => {
    const now = new Date().toISOString();
    const template: any = {
      id: 'template_vl',
      name: '图文多模态模板 (CLIP/BERT)',
      nodes: [
        { id: 'n1', type: 'image_folder', position: { x: 50, y: 50 }, data: { parameters: { folder_path: '/path/to/images' } } },
        { id: 'n2', type: 'medical_report', position: { x: 50, y: 250 }, data: { parameters: { csv_path: '/path/to/reports.csv', text_column: 'report' } } },
        { id: 'n3', type: 'clip', position: { x: 350, y: 150 }, data: { parameters: { model_variant: 'openai/clip-vit-base-patch32' } } },
        { id: 'n4', type: 'gated_fusion', position: { x: 600, y: 150 }, data: { parameters: { gate_type: 'sigmoid' } } },
        { id: 'n5', type: 'classifier', position: { x: 850, y: 150 }, data: { parameters: { num_classes: 2 } } },
        { id: 'n6', type: 'training_config', position: { x: 50, y: 450 }, data: { parameters: { epochs: 100, batch_size: 32 } } }
      ],
      connections: [
        { id: 'e1', source: 'n1', sourceOutput: 'images', target: 'n3', targetInput: 'image' },
        { id: 'e2', source: 'n2', sourceOutput: 'text', target: 'n3', targetInput: 'text' },
        { id: 'e3', source: 'n3', sourceOutput: 'image_features', target: 'n4', targetInput: 'input1' },
        { id: 'e4', source: 'n3', sourceOutput: 'text_features', target: 'n4', targetInput: 'input2' },
        { id: 'e5', source: 'n4', sourceOutput: 'output', target: 'n5', targetInput: 'features' }
      ],
      createdAt: now,
      updatedAt: now
    };
    loadWorkflow(template);
  };

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
          <Panel position="top-center" className="m-2">
            <div className="flex items-center gap-1.5 glass-panel p-1.5 rounded-2xl shadow-2xl shadow-black/10">
              <div className="flex items-center gap-1 bg-gray-900/5 p-1 rounded-xl">
                <ToolbarButton
                  onClick={loadClassificationTemplate}
                  icon={Sparkles}
                  label="分类模板"
                  variant="default"
                />
                <ToolbarButton
                  onClick={loadSegmentationTemplate}
                  icon={Sparkles}
                  label="分割模板"
                  variant="default"
                />
                <ToolbarButton
                  onClick={loadMultimodalTemplate}
                  icon={Sparkles}
                  label="多模态模板"
                  variant="default"
                />
                <ToolbarButton
                  onClick={loadVisionLanguageTemplate}
                  icon={Sparkles}
                  label="图文模板"
                  variant="default"
                />
              </div>
              
              <div className="w-px h-6 bg-gray-300/50 mx-1" />
              
              <div className="flex items-center gap-1">
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
              </div>

              <div className="w-px h-6 bg-gray-300/50 mx-1" />
              
              <div className="flex items-center gap-1">
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
