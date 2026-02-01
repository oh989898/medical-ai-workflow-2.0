import { useState } from 'react';
import { 
  BookOpen, X, ChevronRight, HelpCircle, 
  Play, Layers, GitMerge, Settings, Eye,
  Folder, Maximize, Microscope, Table,
  AlertCircle, CheckCircle2, Lightbulb
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 使用指南数据
const usageGuide = {
  overview: {
    title: '平台概述',
    icon: Lightbulb,
    content: `
## 医学AI可视化工作流平台

本平台是一个面向医学研究人员的低代码/无代码AI工作流构建工具，基于**表示学习范式**设计：

### 核心流程
\`\`\`
数据输入 → 预处理 → 特征编码 → 特征融合 → 下游任务 → 训练配置
\`\`\`

### 适用场景
- 病理图像分析（WSI全切片图像）
- 临床数据挖掘
- 多模态医学数据融合
- 生存分析、疾病预测等任务

### 两种使用模式
1. **小白模式**：使用预设模板，拖拽式构建
2. **专家模式**：完全自定义，精细控制每个参数
    `
  },
  workflow: {
    title: '完整工作流程',
    icon: Play,
    content: `
## 构建工作流的步骤

### 1. 数据输入阶段
**节点类型：数据输入（绿色）**

- **Image Folder**: 从文件夹批量加载图像
  - 设置图像文件夹路径
  - 支持 .jpg, .png, .tif 格式
  - 输出：图像批次 [B, 3, H, W]

- **Pathology WSI**: 病理全切片图像
  - 加载 .svs, .ndpi 等格式
  - 自动切块处理
  - 设置 patch 大小和放大倍数

- **Clinical Data**: 临床表格数据
  - 加载 CSV 文件
  - 指定特征列和标签列

### 2. 预处理阶段
**节点类型：预处理（橙色）**

- **Resize**: 调整图像尺寸
  - 统一输入尺寸，如 224x224

- **Normalize**: 标准化
  - ImageNet 标准化或自定义均值/标准差

- **Augmentation**: 数据增强
  - 随机翻转、旋转、裁剪
  - 提高模型泛化能力

### 3. 特征编码阶段
**节点类型：特征编码（蓝色）**

这是表示学习的核心，将原始数据转换为特征向量：

- **ResNet**: 通用图像编码器
  - 支持 ResNet-18/34/50/101
  - 输出特征维度可配置

- **TITAN**: 病理学基础模型 ⭐
  - 专为病理图像设计
  - 强大的表示学习能力

- **CONCH**: 病理视觉语言模型 ⭐
  - 结合视觉和文本信息
  - 支持零样本学习

- **BERT**: 文本编码器
  - 支持 BioBERT 医学版本
  - 处理临床文本数据

### 4. 特征融合阶段
**节点类型：特征融合（紫色）**

当有多种模态数据时使用：

- **Concatenate**: 特征拼接
  - 将多个特征向量拼接
  - 适用于同类型特征

- **Attention Fusion**: 注意力融合
  - 学习不同模态的重要性权重
  - 自动选择关键信息

- **Bilinear Pooling**: 双线性池化
  - 捕获特征间的高阶交互
  - 适用于多模态融合

### 5. 下游任务阶段
**节点类型：下游任务（红色）**

根据研究目标选择：

- **Classifier**: 分类器
  - 二分类/多分类
  - 支持多层感知机

- **Survival Analysis**: 生存分析 ⭐
  - Cox 比例风险模型
  - DeepSurv 深度学习版本

- **Segmentation Head**: 分割头
  - U-Net 风格解码器
  - 像素级预测

- **MIL**: 多实例学习 ⭐
  - 适用于 WSI 病理图像
  - Attention-MIL 和 Transformer-MIL

### 6. 训练配置阶段
**节点类型：训练配置（灰色）**

- **Optimizer**: 优化器
  - Adam, SGD, AdamW
  - 设置学习率、权重衰减

- **Scheduler**: 学习率调度
  - Step, Cosine, ReduceLROnPlateau

- **Loss Function**: 损失函数
  - CrossEntropy, BCE, MSE
  - 自定义损失权重

- **Trainer**: 训练器
  - 设置 epoch、batch size
  - 早停策略、模型保存
    `
  },
  examples: {
    title: '典型示例',
    icon: Layers,
    content: `
## 示例 1：病理图像分类

### 场景
对病理切片进行癌症分类（良性/恶性）

### 工作流
\`\`\`
[Pathology WSI] → [TITAN] → [Classifier] → [Trainer]
     ↓
[设置 patch_size=224, magnification=20x]
[设置 num_classes=2]
[设置 epochs=50, batch_size=32]
\`\`\`

### 说明
1. 加载 WSI 图像并切成 224x224 的 patches
2. 使用 TITAN 基础模型提取特征
3. 分类器输出 2 类概率
4. 配置训练参数并训练

---

## 示例 2：多模态生存预测

### 场景
结合病理图像和临床数据预测患者生存期

### 工作流
\`\`\`
[Pathology WSI] → [TITAN] → [MIL] ──┐
                                     ├──→ [Concatenate] → [Survival Analysis] → [Trainer]
[Clinical Data] → [BERT] ────────────┘
\`\`\`

### 说明
1. 病理分支：WSI → TITAN → MIL 聚合 patch 特征
2. 临床分支：CSV → BERT 提取文本特征
3. 融合：拼接两种特征
4. 生存分析模型预测风险

---

## 示例 3：图像分割

### 场景
在病理图像中分割肿瘤区域

### 工作流
\`\`\`
[Image Folder] → [Resize] → [ResNet] → [Segmentation Head] → [Trainer]
                   ↓
            [Normalize]
\`\`\`

### 说明
1. 加载图像数据集
2. 预处理：调整尺寸并标准化
3. ResNet 作为编码器提取特征
4. 分割头进行像素级分类
    `
  },
  tips: {
    title: '使用技巧',
    icon: HelpCircle,
    content: `
## 连接规则

### 类型匹配
- **image** → **image**: 图像数据流
- **image** → **embedding**: 编码器自动转换
- **embedding** → **embedding**: 特征传递
- **text** → **embedding**: 文本编码器

### 颜色编码
- 🟢 绿色：数据输入节点
- 🟠 橙色：预处理节点
- 🔵 蓝色：特征编码节点
- 🟣 紫色：特征融合节点
- 🔴 红色：下游任务节点
- ⚪ 灰色：训练配置节点

## 最佳实践

### 1. 数据预处理
- 始终对图像进行标准化
- 根据GPU内存调整 batch size
- 使用数据增强防止过拟合

### 2. 特征编码
- 病理图像优先使用 TITAN/CONCH
- 通用图像使用 ResNet
- 文本数据使用 BERT/BioBERT

### 3. 多模态融合
- 先单独训练各模态
- 再联合微调
- 注意特征维度对齐

### 4. 训练策略
- 使用学习率预热
- 早停防止过拟合
- 保存最佳模型权重

## 常见问题

**Q: 节点无法连接？**
A: 检查输入输出类型是否匹配，注意数据类型颜色提示。

**Q: 代码生成失败？**
A: 确保工作流是连通的，从输入到输出有完整路径。

**Q: 如何查看生成的代码？**
A: 点击工具栏"生成代码"按钮，可查看和下载完整代码。

**Q: 支持哪些病理图像格式？**
A: 支持 .svs, .ndpi, .tiff 等 WSI 格式，以及普通 .jpg, .png。
    `
  }
};

// 节点分类详细说明
const categoryGuides: Record<string, { title: string; description: string; usage: string; tips: string }> = {
  input: {
    title: '数据输入节点',
    description: '工作流的起点，负责加载各种医学数据',
    usage: `
1. 拖拽节点到画布
2. 双击节点或点击右侧属性面板
3. 配置数据路径和参数
4. 连接输出到下游节点
    `,
    tips: `
• Image Folder: 适合批量处理普通图像
• Pathology WSI: 专门处理病理全切片图像
• Clinical Data: 处理结构化表格数据
• 路径可以是绝对路径或相对路径
    `
  },
  transform: {
    title: '预处理节点',
    description: '对原始数据进行清洗、变换和增强',
    usage: `
1. 连接到输入节点的输出
2. 配置预处理参数
3. 可串联多个预处理节点
4. 输出连接到编码器
    `,
    tips: `
• Resize: 统一尺寸是必需的，建议 224x224
• Normalize: ImageNet 预训练模型需要对应标准化
• Augmentation: 训练时开启，推理时关闭
• 预处理顺序：Resize → Normalize → Augmentation
    `
  },
  encoder: {
    title: '特征编码节点',
    description: '核心表示学习模块，将数据转换为特征向量',
    usage: `
1. 接收预处理后的数据
2. 选择合适的预训练模型
3. 配置模型路径和参数
4. 输出 embedding 到下游
    `,
    tips: `
• TITAN: 病理图像首选，性能最佳
• CONCH: 需要文本描述时使用
• ResNet: 通用场景，资源占用少
• BERT: 处理临床文本、报告
• 需要下载对应的预训练权重
    `
  },
  fusion: {
    title: '特征融合节点',
    description: '整合多模态或多源特征',
    usage: `
1. 连接多个编码器的输出
2. 选择融合策略
3. 配置融合参数
4. 输出到下游任务节点
    `,
    tips: `
• Concatenate: 简单直接，维度会累加
• Attention Fusion: 智能加权，推荐首选
• Bilinear Pooling: 捕获交互，计算量大
• 融合前确保特征维度匹配
    `
  },
  head: {
    title: '下游任务节点',
    description: '根据研究目标进行最终预测',
    usage: `
1. 接收编码或融合后的特征
2. 配置任务类型和参数
3. 设置输出类别数
4. 连接到训练配置
    `,
    tips: `
• Classifier: 分类任务，设置 num_classes
• Survival Analysis: 生存分析，需要 time 和 event
• MIL: WSI 分类必备，自动聚合 patches
• Segmentation: 像素级预测，需要标注数据
    `
  },
  config: {
    title: '训练配置节点',
    description: '配置模型训练的各种超参数',
    usage: `
1. 连接到任务节点的配置输入
2. 设置优化器、学习率
3. 配置损失函数
4. 设置训练轮数和早停策略
    `,
    tips: `
• Optimizer: Adam 通用，AdamW 权重衰减更好
• Scheduler: Cosine 学习率衰减平滑
• Loss: 分类用 CrossEntropy，不平衡用 Weighted
• Trainer: 从少量 epoch 开始测试
    `
  }
};

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpSystem({ isOpen, onClose }: HelpSystemProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [showCategoryGuide, setShowCategoryGuide] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeContent = usageGuide[activeSection as keyof typeof usageGuide];
  const Icon = activeContent.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] h-[700px] flex overflow-hidden">
        {/* 左侧导航 */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 text-blue-600">
              <BookOpen className="w-5 h-5" />
              <span className="font-bold">使用指南</span>
            </div>
          </div>
          
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {Object.entries(usageGuide).map(([key, section]) => {
              const SectionIcon = section.icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveSection(key);
                    setShowCategoryGuide(null);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    activeSection === key && !showCategoryGuide
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  )}
                >
                  <SectionIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{section.title}</span>
                  <ChevronRight className={cn(
                    'w-4 h-4 ml-auto',
                    activeSection === key && !showCategoryGuide ? 'opacity-100' : 'opacity-0'
                  )} />
                </button>
              );
            })}
            
            <div className="pt-4 pb-2 px-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                节点分类详解
              </span>
            </div>
            
            {Object.entries(categoryGuides).map(([key, guide]) => (
              <button
                key={key}
                onClick={() => setShowCategoryGuide(key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                  showCategoryGuide === key
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                )}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: {
                      input: '#10b981',
                      transform: '#f59e0b',
                      encoder: '#3b82f6',
                      fusion: '#8b5cf6',
                      head: '#ef4444',
                      config: '#6b7280'
                    }[key]
                  }}
                />
                <span className="text-sm">{guide.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {showCategoryGuide ? (
                <>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ 
                      backgroundColor: {
                        input: '#10b981',
                        transform: '#f59e0b',
                        encoder: '#3b82f6',
                        fusion: '#8b5cf6',
                        head: '#ef4444',
                        config: '#6b7280'
                      }[showCategoryGuide]
                    }}
                  />
                  <h2 className="text-lg font-bold text-gray-900">
                    {categoryGuides[showCategoryGuide].title}
                  </h2>
                </>
              ) : (
                <>
                  <Icon className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">{activeContent.title}</h2>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            {showCategoryGuide ? (
              <CategoryGuideContent guide={categoryGuides[showCategoryGuide]} />
            ) : (
              <div className="prose prose-blue max-w-none">
                <MarkdownContent content={activeContent.content} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 分类指南内容组件
function CategoryGuideContent({ guide }: { guide: { title: string; description: string; usage: string; tips: string } }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">简介</h3>
        <p className="text-blue-800">{guide.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Play className="w-5 h-5 text-green-600" />
            使用方法
          </h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {guide.usage}
          </pre>
        </div>

        <div className="bg-amber-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            使用技巧
          </h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {guide.tips}
          </pre>
        </div>
      </div>
    </div>
  );
}

// 简单的 Markdown 渲染组件
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-gray-900 mt-8 mb-4">
          {line.replace('## ', '')}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          {line.replace('### ', '')}
        </h3>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={key++} className="font-semibold text-gray-900 mt-4 mb-2">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    } else if (line.startsWith('- **')) {
      const match = line.match(/- \*\*(.+?)\*\*:\s*(.+)/);
      if (match) {
        elements.push(
          <div key={key++} className="ml-4 my-2">
            <span className="font-semibold text-blue-700">{match[1]}:</span>
            <span className="text-gray-700"> {match[2]}</span>
          </div>
        );
      }
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={key++} className="ml-6 text-gray-700 list-disc">
          {line.replace('- ', '')}
        </li>
      );
    } else if (line.startsWith('```')) {
      // 代码块开始
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={key++} className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto text-sm font-mono">
          {codeLines.join('\n')}
        </pre>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />);
    } else if (line.startsWith('• ')) {
      elements.push(
        <li key={key++} className="ml-6 text-gray-700 list-disc">
          {line.replace('• ', '')}
        </li>
      );
    } else {
      elements.push(
        <p key={key++} className="text-gray-700 leading-relaxed">
          {line}
        </p>
      );
    }
  }

  return <>{elements}</>;
}

// 帮助按钮组件
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="text-sm font-medium">使用指南</span>
    </button>
  );
}

export default HelpSystem;
