// 节点类型定义
export type NodeCategory = 'input' | 'transform' | 'encoder' | 'fusion' | 'head' | 'config';

// 数据类型定义 - 用于类型检查
export type DataType = 
  | 'image'           // 图像 [B, C, H, W]
  | 'tensor'          // 通用张量
  | 'embedding'       // 嵌入向量 [B, D] 或 [N, D]
  | 'text'            // 文本
  | 'label'           // 标签
  | 'attention'       // 注意力权重
  | 'features'        // 特征图
  | 'any';            // 任意类型

// 张量形状定义
export interface TensorShape {
  batch?: number | null;
  channels?: number | null;
  height?: number | null;
  width?: number | null;
  dim?: number | null;
  seq_len?: number | null;
}

// 端口定义
export interface Port {
  id: string;
  name: string;
  type: DataType;
  shape?: TensorShape;
  description?: string;
}

export interface InputPort extends Port {
  required: boolean;
  defaultValue?: unknown;
}

export interface OutputPort extends Port {
  // 输出端口特有属性
}

// 参数定义
export type ParameterType = 'string' | 'number' | 'boolean' | 'select' | 'list' | 'path';

export interface Parameter {
  id: string;
  name: string;
  type: ParameterType;
  description?: string;
  defaultValue?: unknown;
  required?: boolean;
  options?: { label: string; value: string | number }[]; // 用于select类型
  min?: number;  // 用于number类型
  max?: number;
  step?: number;
  advanced?: boolean; // 是否为高级参数
}

// 节点定义
export interface NodeDefinition {
  id: string;
  type: NodeCategory;
  name: string;
  description: string;
  icon?: string;
  inputs: InputPort[];
  outputs: OutputPort[];
  parameters: Parameter[];
  codeTemplate: string; // Jinja2模板名称
  tags?: string[];
  paperUrl?: string; // 论文链接（教育功能）
  tooltip?: string; // 悬停提示
}

// 节点实例（在画布上的）
export interface NodeInstance {
  id: string;
  type: string; // 对应NodeDefinition.id
  position: { x: number; y: number };
  data: {
    parameters: Record<string, unknown>;
    inputs: Record<string, { nodeId: string; outputId: string } | null>;
  };
}

// 连接定义
export interface Connection {
  id: string;
  source: string; // 源节点ID
  sourceOutput: string; // 源端口ID
  target: string; // 目标节点ID
  targetInput: string; // 目标端口ID
}

// 工作流定义
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: NodeInstance[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}

// 代码生成结果
export interface CodeGenerationResult {
  main_py: string;
  model_py: string;
  dataset_py: string;
  config_yaml: string;
  requirements_txt: string;
  readme_md: string;
}

// 类型兼容性检查
export function isTypeCompatible(sourceType: DataType, targetType: DataType): boolean {
  if (sourceType === targetType) return true;
  if (targetType === 'any') return true;
  if (sourceType === 'embedding' && targetType === 'tensor') return true;
  if (sourceType === 'features' && targetType === 'tensor') return true;
  return false;
}

// 节点分类颜色
export const categoryColors: Record<NodeCategory, string> = {
  input: '#10b981',      // 绿色
  transform: '#f59e0b',  // 橙色
  encoder: '#3b82f6',    // 蓝色
  fusion: '#8b5cf6',     // 紫色
  head: '#ef4444',       // 红色
  config: '#6b7280',     // 灰色
};

// 节点分类标签
export const categoryLabels: Record<NodeCategory, string> = {
  input: '数据输入',
  transform: '预处理',
  encoder: '特征编码',
  fusion: '特征融合',
  head: '下游任务',
  config: '训练配置',
};
