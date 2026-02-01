import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, HelpCircle, Lightbulb, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { NodeDefinition, NodeCategory } from '@/types/nodes';
import { getAllNodeDefinitions, getNodesByCategory, searchNodes, categoryLabels, categoryColors } from '@/nodes/registry';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 分类详细说明
const categoryDescriptions: Record<NodeCategory, {
  shortDesc: string;
  fullDesc: string;
  usage: string;
  tips: string[];
}> = {
  input: {
    shortDesc: '加载医学数据（图像、表格、WSI等）',
    fullDesc: '数据输入节点是工作流的起点，负责从各种数据源加载医学数据。支持病理全切片图像(WSI)、普通图像文件夹、临床表格数据等多种格式。',
    usage: '1. 拖拽节点到画布\n2. 配置数据路径（绝对或相对路径）\n3. 设置格式参数（如WSI的放大倍数）\n4. 连接输出到预处理或编码节点',
    tips: [
      'Pathology WSI: 专为病理切片设计，自动切块处理',
      'Image Folder: 适合批量处理普通图像文件',
      'Clinical Data: 支持CSV格式，可指定特征列和标签列',
      '路径可以是绝对路径或相对于工作目录的路径'
    ]
  },
  transform: {
    shortDesc: '数据清洗、变换和增强',
    fullDesc: '预处理节点对原始数据进行标准化、尺寸调整、数据增强等操作，使数据适合模型输入。这是确保模型性能的关键步骤。',
    usage: '1. 连接到输入节点的输出端口\n2. 配置预处理参数\n3. 可串联多个预处理节点\n4. 输出连接到特征编码节点',
    tips: [
      'Resize: 统一尺寸是必需的，建议使用224x224',
      'Normalize: 使用ImageNet预训练模型时需要对应标准化参数',
      'Augmentation: 训练时开启（提高泛化能力），推理时关闭',
      '推荐顺序: Resize → Normalize → Augmentation'
    ]
  },
  encoder: {
    shortDesc: '特征提取和表示学习（核心节点）',
    fullDesc: '特征编码节点是表示学习的核心，使用预训练模型将原始数据转换为高维特征向量。这是深度学习的关键步骤，决定了模型的表示能力。',
    usage: '1. 接收预处理后的数据\n2. 选择合适的预训练模型\n3. 配置模型路径和参数\n4. 输出embedding到下游节点',
    tips: [
      'TITAN: 病理图像首选，专为病理学设计的基础模型',
      'CONCH: 结合视觉和文本信息，支持零样本学习',
      'ResNet: 通用场景，计算资源占用较少',
      'BERT/BioBERT: 处理临床文本、病理报告',
      '需要下载对应的预训练权重文件'
    ]
  },
  fusion: {
    shortDesc: '多模态特征整合和融合',
    fullDesc: '特征融合节点用于整合来自不同模态或不同源的特征（如图像特征+临床特征）。通过智能融合策略提高模型性能。',
    usage: '1. 连接多个编码器的输出\n2. 选择融合策略\n3. 配置融合参数\n4. 输出到下游任务节点',
    tips: [
      'Concatenate: 简单直接，特征维度会累加',
      'Attention Fusion: 智能加权，自动学习各模态重要性',
      'Bilinear Pooling: 捕获特征间高阶交互，计算量较大',
      '融合前确保各特征维度匹配'
    ]
  },
  head: {
    shortDesc: '下游任务（分类、分割、生存分析等）',
    fullDesc: '下游任务节点根据研究目标进行最终预测，包括分类、分割、生存分析等多种医学AI任务。这是工作流的输出端。',
    usage: '1. 接收编码或融合后的特征\n2. 配置任务类型和参数\n3. 设置输出类别数或任务特定参数\n4. 连接到训练配置节点',
    tips: [
      'Classifier: 分类任务，设置num_classes为类别数',
      'Survival Analysis: 生存分析，需要time和event标签',
      'MIL: 多实例学习，适合WSI病理图像分类',
      'Segmentation: 像素级预测，需要像素级标注数据'
    ]
  },
  config: {
    shortDesc: '训练超参数和优化配置',
    fullDesc: '训练配置节点设置模型训练的各种超参数，包括优化器、学习率调度、损失函数、训练轮数等。',
    usage: '1. 连接到任务节点的配置输入\n2. 选择优化器类型并设置学习率\n3. 配置损失函数\n4. 设置训练轮数和早停策略',
    tips: [
      'Optimizer: Adam通用，AdamW带权重衰减更适合大模型',
      'Scheduler: Cosine衰减平滑，Step衰减简单直接',
      'Loss: 分类用CrossEntropy，类别不平衡用Weighted',
      'Trainer: 从少量epoch开始测试，避免浪费时间'
    ]
  }
};

// 可拖拽节点项 - Apple 风格
function DraggableNodeItem({ node }: { node: NodeDefinition }) {
  const color = categoryColors[node.type];

  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', node.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        'p-4 mb-3 rounded-2xl border cursor-move transition-all duration-300',
        'bg-white/80 hover:bg-white',
        'shadow-sm hover:shadow-lg',
        'border-gray-100 hover:border-blue-200'
      )}
      style={{ borderLeftWidth: '4px', borderLeftColor: color }}
      title={node.tooltip || node.description}
    >
      <div className="font-semibold text-sm text-gray-900 tracking-tight">{node.name}</div>
      <div className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{node.description}</div>
      {node.tags && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {node.tags.slice(0, 3).map(tag => (
            <span 
              key={tag} 
              className="text-xs px-2.5 py-1 bg-gray-100/80 rounded-full text-gray-600 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 分类帮助提示 - Apple 风格
function CategoryHelp({ category }: { category: NodeCategory }) {
  const [isOpen, setIsOpen] = useState(false);
  const desc = categoryDescriptions[category];
  const color = categoryColors[category];

  return (
    <div className="mt-3 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors font-medium"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>如何使用这类节点？</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      
      {isOpen && (
        <div className="mt-3 p-4 bg-blue-50/80 backdrop-blur-sm rounded-2xl text-xs space-y-3 border border-blue-100">
          <p className="text-gray-700 leading-relaxed">{desc.fullDesc}</p>
          
          <div className="pt-3 border-t border-blue-200/60">
            <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>使用方法</span>
            </div>
            <pre className="text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
              {desc.usage}
            </pre>
          </div>
          
          <div className="pt-3 border-t border-blue-200/60">
            <div className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
              <Info className="w-3.5 h-3.5" />
              <span>使用技巧</span>
            </div>
            <ul className="space-y-1.5">
              {desc.tips.map((tip, idx) => (
                <li key={idx} className="text-gray-600 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// 分类折叠面板 - Apple 风格
function CategorySection({ 
  category, 
  nodes, 
  isOpen, 
  onToggle 
}: { 
  category: NodeCategory; 
  nodes: NodeDefinition[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const color = categoryColors[category];
  const label = categoryLabels[category];
  const desc = categoryDescriptions[category];

  if (nodes.length === 0) return null;

  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-white/60 rounded-2xl transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full ring-2 ring-offset-2" 
            style={{ 
              backgroundColor: color,
              ringColor: `${color}40`
            }}
          />
          <span className="font-semibold text-sm text-gray-800 tracking-tight">{label}</span>
          <span className="text-xs text-gray-400 font-medium bg-gray-100/80 px-2 py-0.5 rounded-full">
            {nodes.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {!isOpen && (
        <div className="ml-9 text-xs text-gray-500 mt-1 font-medium">
          {desc.shortDesc}
        </div>
      )}
      
      {isOpen && (
        <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200/60">
          <CategoryHelp category={category} />
          {nodes.map(node => (
            <DraggableNodeItem key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

// 节点库主组件 - Apple 风格
export function NodeLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<NodeCategory>>(
    new Set(['input', 'encoder', 'head'])
  );

  const toggleCategory = (category: NodeCategory) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const categories: NodeCategory[] = ['input', 'transform', 'encoder', 'fusion', 'head', 'config'];

  // 搜索结果
  const searchResults = searchQuery ? searchNodes(searchQuery) : null;

  return (
    <div className="w-80 h-full flex flex-col bg-transparent">
      {/* 头部 - Apple 风格 */}
      <div className="p-5">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">节点库</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索节点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/80 border border-gray-200 rounded-2xl text-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                       transition-all duration-200 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* 节点列表 */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {searchResults ? (
          // 搜索结果视图
          <div>
            <div className="text-sm text-gray-500 mb-4 font-medium">
              找到 {searchResults.length} 个结果
            </div>
            {searchResults.map(node => (
              <DraggableNodeItem key={node.id} node={node} />
            ))}
          </div>
        ) : (
          // 分类视图
          <div>
            <div className="mb-5 p-4 bg-amber-50/80 backdrop-blur-sm rounded-2xl border border-amber-100">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-900">
                  <p className="font-semibold mb-2 text-sm">使用提示</p>
                  <div className="space-y-1.5 leading-relaxed">
                    <p>1. 点击分类展开查看节点</p>
                    <p>2. 点击"如何使用"了解详情</p>
                    <p>3. 拖拽节点到画布使用</p>
                  </div>
                </div>
              </div>
            </div>
            
            {categories.map(category => (
              <CategorySection
                key={category}
                category={category}
                nodes={getNodesByCategory(category)}
                isOpen={openCategories.has(category)}
                onToggle={() => toggleCategory(category)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部提示 - Apple 风格 */}
      <div className="p-5 border-t border-gray-200/60">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-600">
            <p className="font-semibold mb-2 text-sm text-gray-800">标准工作流程</p>
            <p className="leading-relaxed font-medium text-gray-500">
              输入 → 预处理 → 编码 → (融合) → 任务 → 训练
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
