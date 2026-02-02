import { useState } from 'react';
import { 
  BookOpen, X, ChevronRight, HelpCircle, 
  Play, Layers,
  Folder, Lightbulb
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 使用指南数据
const usageGuide = {
  quickstart: {
    title: '新手村 (3分钟上手)',
    icon: Lightbulb,
    content: `
## 核心概念：Features vs Feature Map

### 1. Spatial Feature Map (空间特征图)
- **形象比喻**：带有标记的“增强照片”。
- **特点**：保留了物体的**位置信息**（知道病灶在图中的哪个坐标）。
- **用途**：主要用于**分割任务**（指哪打哪）。
- **连线提示**：从编码器的 \`Spatial Feature Map\` 端口连出。

### 2. Global Features (全局特征/嵌入)
- **形象比喻**：一份精简的“体检结论”。
- **特点**：总结了整张图的**核心含义**（语义信息），但丢失了具体位置。
- **用途**：主要用于**分类任务**、**生存分析**、**相似检索**。
- **连线提示**：从编码器的 \`Global Features\` 端口连出。

---

### 常见连接误区
- ❌ **错误**：将 \`Global Features\` 连入 \`Segmentation Head\`。
- ✅ **正确**：分割任务必须使用 \`Spatial Feature Map\`，因为模型需要知道具体的空间轮廓。

---

## 🚀 3分钟构建你的第一个AI工作流

如果你是第一次使用，请跟随以下“傻瓜式”步骤：

### 第一步：请出“原材料” (数据输入)
在左侧找到**绿色**的节点，拖出一个 **[Image Folder]** 或 **[Pathology WSI]**。这就是你要训练的医学图像。

### 第二步：给数据“洗个澡” (预处理)
在左侧找到**橙色**的节点，拖出一个 **[Resize]**。把第一步节点的右边圆点连到它的左边圆点。
*💡 技巧：这能确保所有图片大小一致。*

### 第三步：换个“聪明脑子” (特征编码)
在左侧找到**蓝色**的节点，拖出一个 **[ResNet50]** 或 **[TITAN]**。把它连在预处理节点后面。
*💡 解释：这是AI的灵魂，它负责把图片看懂。*

### 第四步：下达“任务指令” (下游任务)
在左侧找到**红色**的节点，拖出一个 **[Classifier]** (分类器)。连上！
*💡 解释：告诉AI你要做分类（比如看这图是有病还是没病）。*

### 第五步：告诉它“怎么学习” (训练配置)
在左侧找到**灰色**的节点，拖出一个 **[Training Config]**。
*💡 解释：不用连线，放着就行。它会告诉AI要学多少轮。*

### 第六步：见证奇迹 (生成代码)
点击顶部的 **“生成代码”** 按钮。恭喜！你已经完成了一个深度学习项目的架构设计。

---

## 💡 常见“傻瓜式”配方 (可以直接照抄)

### 模式 A：病理图片分类 (最常用)
- **[Pathology WSI]** → **[Resize]** → **[TITAN]** → **[Classifier]**
- *适合场景：看这张切片是有癌症还是正常的。*

### 模式 B：多模态预测 (进阶版)
- **[Pathology WSI]** → **[TITAN]** ──┐
- **[Clinical CSV]** → **[BERT]** ──┴→ **[Concat]** → **[Survival Head]**
- *适合场景：结合图片和病历，预测病人的生存时间。*

---
**🌈 颜色小秘密：**
- 🟢 **绿色** = 数据从哪来
- 🟠 **橙色** = 数据变个样
- 🔵 **蓝色** = AI提取特征
- 🔴 **红色** = AI完成什么任务
- ⚪ **灰色** = 训练时的各种参数
    `
  },
  overview: {
    title: '平台概述',
    icon: BookOpen,
    content: `
## 医学AI可视化工作流平台

本平台是一个面向医学研究人员的低代码AI工作流构建工具，旨在帮助您快速搭建和训练专业的医学AI模型。

### 核心流程
\`\`\`
数据输入 → 预处理 → 特征编码 → 特征融合 → 下游任务 → 训练配置
\`\`\`

### 适用场景
- **病理图像分析**：处理超大尺寸的 WSI 全切片图像。
- **图像分割**：精准定位病灶区域。
- **临床数据挖掘**：结合电子病历（EMR）进行疾病预测。
- **生存分析**：预测患者的生存风险和时间。

### 我们的目标
让医学专家专注于临床问题的定义，而将复杂的深度学习代码生成和架构设计交给 AI。
    `
  },
  data_prep: {
    title: '📁 数据准备规范',
    icon: Folder,
    content: `
## 核心原则：数据决定模型上限

在运行生成的代码前，你必须按照以下规范整理你的医学数据。

### 1. 图像分类 (Image Folder)
**组织形式：**
\`\`\`
dataset/
├── train/
│   ├── Normal/        (文件夹名为类别名)
│   │   ├── img1.jpg
│   └── Tumor/
│       ├── img3.jpg
└── val/ ...
\`\`\`

### 2. 图像分割 (Segmentation Dataset)
**组织形式：**
\`\`\`
dataset/
├── images/            (原始图片)
│   ├── patient_01.jpg
│   └── patient_02.jpg
└── masks/             (对应的标签掩码)
    ├── patient_01.png
    └── patient_02.png
\`\`\`
*💡 注意：images 和 masks 文件夹下的文件名必须完全一致。*

### 3. 病理全切片 (Pathology WSI)
**组织形式：**
- 准备一个包含所有 WSI 文件的文件夹（.svs, .ndpi 等）。
- 提供一个 CSV 映射表，记录 \`slide_id\` 与 \`label\`。

### 4. 临床 CSV 数据 (Clinical CSV)
**规范要求：**
- **CSV 编码**：统一使用 UTF-8。
- **ID列**：确保有一列唯一的患者/样本 ID。
- **特征列**：用于输入的数值或分类指标。

### 5. 无标注自动分割 (SAM Segmentor)
**使用 SAM (Segment Anything Model)：**
- **无需标注**：如果您没有 Mask 标签，可以使用 SAM 节点进行自动分割。
- **工作原理**：利用 Meta 开源的 SAM 大模型，通过自动采样点生成全图分割掩码。
- **配置建议**：
    - 图像较复杂时，调高“点密度”参数。
    - 生成的代码会自动处理模型权重的下载与加载。

### 6. 多模态特征融合 (Feature Fusion)
**医学 AI 的核心：**
- **拼接融合 (Concatenate)**：最简单直接，将图像特征和临床特征连在一起。
- **门控融合 (Gated Fusion)**：**推荐！** 它能自动学习“图像”和“临床”哪个更重要。如果某位患者的图片特征不明显，它会自动加大临床数据的权重。
- **交叉注意力 (Cross Attention)**：让图像去“询问”临床数据，提取两者相关的关键特征。

---

## 💡 角色定位
- **数据**是“原材料”。
- **工作流**是“加工图纸”。
- **生成的代码**是“自动化工厂”。
如果没有按照规范摆放“原材料”，工厂将无法正常运转。
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
[Seg Dataset] → [ResNet] → [Seg Head]
      ↓           (Feature)
   (Masks) ──────────┘
\`\`\`

### 说明
1. **Seg Dataset**：同时提供原图和掩码。
2. **ResNet**：提取高维特征图（Feature Map）。
3. **Seg Head**：接收特征图和掩码进行像素级学习。

## 示例 4：SAM 自动分割 (无需标注)
  
### 场景
只有原始病理图片，需要自动提取细胞或组织轮廓。

### 工作流
\`\`\`
[Image Folder] → [SAM Segmentor]
\`\`\`

### 说明
1. **Image Folder**：提供原始图片路径。
2. **SAM Segmentor**：选择模型规模（如 ViT-B），系统将全自动生成分割掩码并保存。

## 示例 5：图文多模态诊断 (CLIP/BERT)
  
### 场景
结合患者的 CT 图像和放射科医生的诊断报告文本，进行综合病情评估。

### 工作流
\`\`\`
[Image Folder] ──→ [CLIP Visual] ──┐
                                   ↓
                             [Gated Fusion] ──→ [Classifier]
                                   ↑
[Medical Report] ─→ [CLIP Text/BERT] ┘
\`\`\`

### 说明
1. **Medical Report**：准备一个 CSV，第一列是患者 ID，第二列是报告文本。
2. **CLIP**：这是一个“双塔”模型，能同时处理图片和文字，并将它们对齐。
3. **BERT**：如果您只想处理文本特征，可以使用 BERT 节点。
4. **提示**：生成的代码会自动调用 Hugging Face 的 Tokenizer 来处理文字，无需您手动切词。
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
  const [activeSection, setActiveSection] = useState<string>('quickstart');
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
