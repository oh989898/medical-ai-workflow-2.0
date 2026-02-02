import { useState } from 'react';
import { X, ExternalLink, Info, AlertCircle, ChevronRight, HelpCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { NodeDefinition, Parameter } from '@/types/nodes';
import { useWorkflowStore } from '@/stores/workflowStore';
import { categoryLabels, categoryColors } from '@/types/nodes';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 参数输入组件 - Apple 风格
function ParameterInput({
  param,
  value,
  onChange
}: {
  param: Parameter;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const renderInput = () => {
    switch (param.type) {
      case 'string':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.description}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl text-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                       transition-all duration-200 placeholder:text-gray-400"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={param.min}
            max={param.max}
            step={param.step}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl text-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                       transition-all duration-200"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <div className={cn(
              "w-12 h-7 rounded-full transition-all duration-300 relative",
              value ? "bg-blue-500" : "bg-gray-300"
            )}>
              <input
                type="checkbox"
                checked={(value as boolean) || false}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                "absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300",
                value ? "translate-x-5" : "translate-x-0"
              )} />
            </div>
            <span className="ml-3 text-sm text-gray-600 font-medium">
              {value ? '启用' : '禁用'}
            </span>
          </label>
        );

      case 'select':
        return (
          <div className="relative">
            <select
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl text-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                         transition-all duration-200 appearance-none cursor-pointer"
            >
              <option value="">请选择...</option>
              {param.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>
        );

      case 'list':
        return (
          <textarea
            value={Array.isArray(value) ? value.join(', ') : ''}
            onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()))}
            placeholder="用逗号分隔多个值"
            rows={3}
            className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl text-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                       transition-all duration-200 placeholder:text-gray-400 resize-none"
          />
        );

      case 'path':
        return (
          <div className="flex gap-2">
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="/path/to/file"
              className="flex-1 px-4 py-3 bg-white/80 border border-gray-200 rounded-xl text-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                         transition-all duration-200 placeholder:text-gray-400"
            />
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    // 在浏览器环境中无法获取文件的完整绝对路径，这里仅作为演示
                    // 实际使用时用户需要手动输入服务器上的绝对路径
                    onChange(file.name);
                  }
                };
                input.click();
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium
                         transition-all duration-200 text-gray-700"
            >
              浏览
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("mb-5", param.advanced && "border-l-2 border-gray-200 pl-4")}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-800 flex items-center gap-2 tracking-tight">
          {param.name}
          {param.required && <span className="text-red-500">*</span>}
          {param.advanced && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">
              高级
            </span>
          )}
        </label>
        {param.description && (
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-blue-500 transition-colors" />
            {showTooltip && (
              <div className="absolute right-0 bottom-full mb-2 w-56 p-3 
                              bg-white/95 backdrop-blur-xl border border-gray-200/50 
                              text-gray-600 text-xs rounded-2xl z-50 shadow-2xl shadow-black/10 animate-in">
                <p className="font-medium leading-relaxed">{param.description}</p>
                <div className="absolute top-full right-3 border-8 border-transparent border-t-white/95" />
              </div>
            )}
          </div>
        )}
      </div>
      {renderInput()}
    </div>
  );
}

// 属性面板主组件 - Apple 风格
export function PropertiesPanel() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { selectedNodeId, nodes, updateNodeParameter, setSelectedNode } = useWorkflowStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  
  if (!selectedNode) {
    return (
      <div className="w-80 h-full flex flex-col bg-transparent">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">选择一个节点以编辑属性</p>
            <p className="text-xs text-gray-400 mt-2">点击画布上的节点查看详情</p>
          </div>
        </div>
      </div>
    );
  }

  const { definition, parameters } = selectedNode.data as { 
    definition: NodeDefinition; 
    parameters: Record<string, any>; 
  };
  const color = categoryColors[definition.type];

  // 分离基础参数和高级参数
  const basicParams = definition.parameters.filter((p: Parameter) => !p.advanced);
  const advancedParams = definition.parameters.filter((p: Parameter) => p.advanced);

  return (
    <div className="w-80 h-full flex flex-col bg-transparent">
      {/* 头部 - Apple 风格 */}
      <div className="p-5 border-b border-gray-200/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full ring-2 ring-offset-2"
              style={{ 
                backgroundColor: color,
                boxShadow: `0 0 0 2px ${color}40`
              }}
            />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {categoryLabels[definition.type]}
            </span>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{definition.name}</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{definition.description}</p>
        
        {/* 端口详细说明 */}
        <div className="mt-4 space-y-3">
          {definition.inputs.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">输入接口 (Inputs)</h4>
              <div className="space-y-2">
                {definition.inputs.map(input => (
                  <div key={input.id} className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="text-xs font-bold text-gray-700">{input.name}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-normal">{input.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {definition.outputs.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">输出接口 (Outputs)</h4>
              <div className="space-y-2">
                {definition.outputs.map(output => (
                  <div key={output.id} className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-xs font-bold text-gray-700">{output.name}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-normal">{output.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 数据准备提示 - 针对所有关键节点 */}
        {(definition.type === 'input' || definition.type === 'head' || definition.type === 'encoder') && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 text-blue-700 mb-1.5">
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                💡 使用指南
              </span>
            </div>
            <p className="text-xs text-blue-600/80 leading-relaxed whitespace-pre-line">
              {/* 输入节点提示 */}
              {definition.id === 'image_folder' && "• 数据准备：请确保图片按类别存放于子文件夹中（如 train/Normal/*.jpg）。"}
              {definition.id === 'segmentation_dataset' && "• 数据准备：请分别提供原图文件夹和掩码文件夹，文件名需一一对应。"}
              {definition.id === 'pathology_wsi' && "• 数据准备：请提供包含 .svs/.ndpi 等切片文件的目录，程序将自动切块。"}
              {definition.id === 'clinical_csv' && "• 数据准备：请确保 CSV 包含 ID 列、特征列和标签列。"}
              
              {/* 编码器提示 */}
              {definition.type === 'encoder' && "• 核心概念：本节点有两个输出。\n  - Global Features: 汇总特征，用于分类或生存分析。\n  - Spatial Feature Map: 空间特征图，仅用于分割任务。"}

              {/* 任务头提示 */}
              {definition.id === 'segmentation_head' && "• 连接建议：请连接编码器的 [Spatial Feature Map] 输出端口，以及数据集的 [Masks] 输出。"}
              {definition.id === 'sam_segmentor' && "• 高级功能：连接 [Images] 端口即可实现全自动分割。点密度越高，分割越精细。"}
              {definition.id === 'classifier' && "• 连接建议：请连接编码器的 [Global Features] 端口。"}
              {definition.id === 'gated_fusion' && "• 连接建议：将图像特征连入 Modal 1，临床特征连入 Modal 2。系统将自动学习融合权重。"}
              {definition.id === 'cross_attention' && "• 连接建议：Query 通常连入主模态（图像），Key/Value 连入辅助模态（临床/文本）。"}
              {definition.id === 'survival_head' && "• 连接建议：适用于多模态融合后的特征输入。"}
            </p>
          </div>
        )}
        
        {/* 论文链接 */}
        {definition.paperUrl && (
          <a
            href={definition.paperUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:text-blue-700 
                       font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            查看论文
          </a>
        )}
      </div>

      {/* 参数列表 */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* 基础参数 */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 tracking-tight">基础设置</h3>
          {basicParams.map((param: Parameter) => (
            <ParameterInput
              key={param.id}
              param={param}
              value={parameters[param.id]}
              onChange={(value) =>
                updateNodeParameter(selectedNode.id, param.id, value)
              }
            />
          ))}
        </div>

        {/* 高级参数 */}
        {advancedParams.length > 0 && (
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-gray-700 
                         mb-4 transition-colors tracking-tight"
            >
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform duration-200",
                showAdvanced && "rotate-90"
              )} />
              高级设置
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {advancedParams.length}
              </span>
            </button>
            
            {showAdvanced && (
              <div className="animate-in">
                {advancedParams.map((param: Parameter) => (
                  <ParameterInput
                    key={param.id}
                    param={param}
                    value={parameters[param.id]}
                    onChange={(value) =>
                      updateNodeParameter(selectedNode.id, param.id, value)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部信息 - Apple 风格 */}
      <div className="p-5 border-t border-gray-200/60">
        <div className="text-xs text-gray-500 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">输入端口:</span>
            <span className="bg-gray-100 px-2 py-1 rounded-lg">
              {definition.inputs.length > 0
                ? definition.inputs.map((i) => i.name).join(", ")
                : "无"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">输出端口:</span>
            <span className="bg-gray-100 px-2 py-1 rounded-lg">
              {definition.outputs.map((o) => o.name).join(", ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
