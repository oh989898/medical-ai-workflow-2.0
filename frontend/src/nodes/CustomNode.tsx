import { memo, useState, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { 
  Folder, Microscope, Table, Maximize, Sliders, Palette, Shuffle,
  Layers, Grid3x3, Dna, Eye, Type, Combine, GitMerge, Focus,
  Tags, Activity, LayoutGrid, Settings, TrendingDown, Target, SlidersHorizontal,
  AlertCircle, CheckCircle2, Link2, Unlink, AlertTriangle, Info
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { NodeDefinition, Parameter, InputPort, OutputPort } from '@/types/nodes';
import { categoryColors } from '@/types/nodes';
import { useWorkflowStore } from '@/stores/workflowStore';

// 工具函数
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder, Microscope, Table, Maximize, Sliders, Palette, Shuffle,
  Layers, Grid3x3, Dna, Eye, Type, Combine, GitMerge, Focus,
  Tags, Activity, LayoutGrid, Settings, TrendingDown, Target, SlidersHorizontal
};

// 节点组件属性
interface CustomNodeData {
  definition: NodeDefinition;
  parameters: Record<string, unknown>;
}

// 连接状态类型
type ConnectionStatus = 'connected' | 'disconnected' | 'partial';

function CustomNode(props: NodeProps) {
  const { id, data, selected } = props;
  const nodeData = data as unknown as CustomNodeData;
  const { definition, parameters } = nodeData;
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredPort, setHoveredPort] = useState<{ id: string, description?: string } | null>(null);
  
  const Icon = definition.icon ? iconMap[definition.icon] : null;
  const color = categoryColors[definition.type];
  
  // 获取连接状态
  const { getNodeConnections } = useWorkflowStore();
  const connections = getNodeConnections(id);
  
  // 检查输入端口连接状态
  const isInputConnected = (inputId: string) => {
    return connections.some(c => c.target === id && c.targetInput === inputId);
  };
  
  // 检查参数是否已设置
  const isParamSet = (paramId: string) => {
    const param = definition.parameters.find((p: Parameter) => p.id === paramId);
    if (!param?.required) return true;
    return parameters[paramId] !== undefined && parameters[paramId] !== '';
  };
  
  // 检查节点是否配置完整
  const isConfigured = definition.parameters.every((p: Parameter) => !p.required || isParamSet(p.id));
  
  // 计算连接状态
  const connectionStatus: ConnectionStatus = useMemo(() => {
    const requiredInputs = definition.inputs.filter((i: InputPort) => i.required);
    const connectedInputs = requiredInputs.filter((i: InputPort) => isInputConnected(i.id));
    
    // 检查是否有输出连接（对于非输入节点）
    const hasOutputConnection = connections.some(c => c.source === id);
    const isInputNode = definition.type === 'input';
    
    // 输入节点只需要检查输出连接
    if (isInputNode) {
      return hasOutputConnection ? 'connected' : 'disconnected';
    }
    
    // 其他节点需要检查输入连接
    if (requiredInputs.length === 0) {
      // 没有必需输入的节点
      return hasOutputConnection ? 'connected' : 'partial';
    }
    
    if (connectedInputs.length === requiredInputs.length) {
      // 所有必需输入都已连接
      return hasOutputConnection ? 'connected' : 'partial';
    }
    
    if (connectedInputs.length === 0) {
      return 'disconnected';
    }
    
    return 'partial';
  }, [connections, definition.inputs, definition.type, id]);
  
  // 获取连接状态显示信息
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: Link2,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          label: '已连接'
        };
      case 'disconnected':
        return {
          icon: Unlink,
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
          label: '未连接'
        };
      case 'partial':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          label: '部分连接'
        };
    }
  };
  
  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  
  // 计算端口区域高度
  const maxPorts = Math.max(definition.inputs.length, definition.outputs.length);
  const portsAreaHeight = maxPorts > 0 ? maxPorts * 28 + 16 : 0;
  
  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 bg-white/90 shadow-lg transition-all duration-200',
        selected ? 'ring-2 ring-offset-2' : '',
        connectionStatus === 'connected' ? 'border-green-400' : 
        connectionStatus === 'partial' ? 'border-yellow-400' : 'border-gray-200'
      )}
      style={{
        '--tw-ring-color': selected ? color : undefined,
        minWidth: '240px'
      } as React.CSSProperties}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 节点头部 */}
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-t-2xl border-b border-gray-100"
        style={{ backgroundColor: `${color}15` }}
      >
        {Icon && (
          <div style={{ color }}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <span className="font-semibold text-sm text-gray-800 truncate flex-1">
          {definition.name}
        </span>
        
        {/* 连接状态指示器 */}
        <div 
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            statusInfo.bgColor,
            statusInfo.color
          )}
          title={statusInfo.label}
        >
          <StatusIcon className="w-3 h-3" />
          <span className="hidden sm:inline">{statusInfo.label}</span>
        </div>
        
        {/* 配置状态指示器 */}
        {isConfigured ? (
          <div title="配置完整">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          </div>
        ) : (
          <div title="配置不完整">
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          </div>
        )}
      </div>
      
      {/* 节点内容区域 */}
      <div className="px-4 py-3 text-xs text-gray-600">
        <p className="truncate text-gray-500 mb-2">{definition.description}</p>
        
        {/* 显示关键参数 */}
        {definition.parameters.slice(0, 2).map((param: Parameter) => (
          <div key={param.id} className="flex items-center gap-1.5 mb-1">
            <span className="text-gray-400 flex-shrink-0">{param.name}:</span>
            <span className={cn(
              "font-mono text-xs truncate",
              isParamSet(param.id) ? "text-gray-700" : "text-orange-400"
            )}>
              {parameters[param.id]?.toString() || '未设置'}
            </span>
          </div>
        ))}
        {definition.parameters.length > 2 && (
          <div className="text-gray-400 text-xs mt-1">+{definition.parameters.length - 2} 更多参数</div>
        )}
      </div>
      
      {/* 端口区域 - 独立区域，不与内容重叠 */}
      {maxPorts > 0 && (
        <div 
          className="relative border-t border-gray-100 bg-gray-50/50 rounded-b-2xl"
          style={{ height: `${portsAreaHeight}px` }}
        >
          {/* 输入端口 */}
          {definition.inputs.map((input: InputPort, index: number) => {
            const connected = isInputConnected(input.id);
            return (
              <div
                key={input.id}
                className="absolute left-0 flex items-center group"
                style={{ top: `${12 + index * 28}px` }}
                onMouseEnter={() => setHoveredPort({ id: input.id, description: input.description })}
                onMouseLeave={() => setHoveredPort(null)}
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={input.id}
                  className={cn(
                    "!w-3 !h-3 !border-2 !rounded-full !-ml-1.5 transition-colors",
                    connected ? "!bg-green-500 !border-green-500" : "!bg-white !border-gray-300"
                  )}
                />
                <div className="flex items-center gap-1 ml-4">
                  <span className={cn(
                    "text-xs whitespace-nowrap",
                    connected ? "text-green-600 font-medium" : "text-gray-400"
                  )}>
                    {input.name}
                    {input.required && <span className="text-red-400 ml-0.5">*</span>}
                  </span>
                  {input.description && (
                    <Info className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors" />
                  )}
                </div>
              </div>
            );
          })}
          
          {/* 输出端口 */}
          {definition.outputs.map((output: OutputPort, index: number) => {
            const hasConnection = connections.some(c => c.source === id && c.sourceOutput === output.id);
            return (
              <div
                key={output.id}
                className="absolute right-0 flex items-center group"
                style={{ top: `${12 + index * 28}px` }}
                onMouseEnter={() => setHoveredPort({ id: output.id, description: output.description })}
                onMouseLeave={() => setHoveredPort(null)}
              >
                <div className="flex items-center gap-1 mr-4">
                  {output.description && (
                    <Info className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors" />
                  )}
                  <span className={cn(
                    "text-xs whitespace-nowrap",
                    hasConnection ? "text-green-600 font-medium" : "text-gray-400"
                  )}>
                    {output.name}
                  </span>
                </div>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.id}
                  className={cn(
                    "!w-3 !h-3 !border-2 !rounded-full !-mr-1.5 transition-colors",
                    hasConnection ? "!bg-green-500 !border-green-500" : "!bg-white"
                  )}
                  style={{ borderColor: hasConnection ? undefined : color }}
                />
              </div>
            );
          })}
        </div>
      )}
      
      {/* Port Tooltip */}
      {hoveredPort?.description && (
        <div className="absolute left-full top-0 ml-4 p-3 bg-gray-900/95 text-white text-xs rounded-xl shadow-2xl z-[100] w-64 backdrop-blur-sm border border-white/10">
          <div className="font-bold mb-1 flex items-center gap-1.5 text-blue-400">
            <Info className="w-3.5 h-3.5" />
            端口说明
          </div>
          <div className="leading-relaxed opacity-90 whitespace-pre-line">
            {hoveredPort.description}
          </div>
          <div className="absolute right-full top-4 -translate-y-1/2 border-8 border-transparent border-r-gray-900/95" />
        </div>
      )}
      
      {/* Node Tooltip */}
      {showTooltip && !hoveredPort && definition.tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl whitespace-nowrap z-50">
          {definition.tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

export default memo(CustomNode);
