import type { NodeDefinition, NodeCategory } from '@/types/nodes';

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

// 节点注册表 - 所有可用节点的定义
export const nodeRegistry: Record<string, NodeDefinition> = {
  // ==================== Input Nodes ====================
  'image_folder': {
    id: 'image_folder',
    type: 'input',
    name: 'Image Folder',
    description: '从文件夹加载图像数据',
    icon: 'Folder',
    inputs: [],
    outputs: [
      {
        id: 'images',
        name: 'Images',
        type: 'image',
        shape: { batch: null, channels: 3, height: null, width: null },
        description: '🖼️ 原始图像流 [B, 3, H, W]。\n💡 建议：连接至“预处理”节点进行缩放，或直接连至“特征编码”节点。'
      }
    ],
    parameters: [
      {
        id: 'folder_path',
        name: '文件夹路径',
        type: 'path',
        description: '图像文件夹路径',
        required: true
      },
      {
        id: 'extensions',
        name: '文件扩展名',
        type: 'list',
        description: '支持的图像格式',
        defaultValue: ['.jpg', '.png', '.tif']
      }
    ],
    codeTemplate: 'image_folder',
    tags: ['input', 'image'],
    tooltip: '加载图像数据集。要求：数据应按类别存放于子文件夹中，例如 dataset/class_a/*.jpg'
  },

  'pathology_wsi': {
    id: 'pathology_wsi',
    type: 'input',
    name: 'Pathology WSI',
    description: '加载病理全切片图像',
    icon: 'Microscope',
    inputs: [],
    outputs: [
      {
        id: 'patches',
        name: 'Patches',
        type: 'image',
        shape: { batch: null, channels: 3, height: 224, width: 224 },
        description: '🖼️ 从大图切出的图像块流 [N, 3, 224, 224]。\n💡 建议：连接至 TITAN、UNI 或 ResNet 编码器。'
      },
      {
        id: 'coordinates',
        name: 'Coordinates',
        type: 'tensor',
        description: '📍 Patch 坐标 (x, y)。\n记录了每个图像块在原始大图中的位置。\n💡 建议：用于热力图生成或结果可视化。'
      }
    ],
    parameters: [
      {
        id: 'wsi_path',
        name: 'WSI路径',
        type: 'path',
        description: '包含所有WSI文件的文件夹路径',
        required: true
      },
      {
        id: 'patch_size',
        name: 'Patch大小',
        type: 'number',
        description: '切块尺寸',
        defaultValue: 224,
        min: 32,
        max: 1024,
        step: 32
      },
      {
        id: 'magnification',
        name: '放大倍数',
        type: 'select',
        description: '读取的放大倍数',
        defaultValue: 20,
        options: [
          { label: '5x', value: 5 },
          { label: '10x', value: 10 },
          { label: '20x', value: 20 },
          { label: '40x', value: 40 }
        ]
      }
    ],
    codeTemplate: 'pathology_wsi',
    tags: ['input', 'pathology', 'wsi'],
    tooltip: '加载WSI病理大图。要求：提供包含.svs/.ndpi文件的目录路径'
  },

  'clinical_csv': {
    id: 'clinical_csv',
    type: 'input',
    name: 'Clinical Data',
    description: '加载临床数据表格',
    icon: 'Table',
    inputs: [],
    outputs: [
      {
        id: 'features',
        name: 'Features',
        type: 'embedding',
        shape: { batch: null, dim: null },
        description: '📊 结构化特征向量。\n从 CSV 表格中提取的数值指标。\n💡 建议：连接至“特征融合”节点（如 Gated Fusion）。'
      },
      {
        id: 'labels',
        name: 'Labels',
        type: 'label',
        description: '🎯 标签数据。\n用于训练目标的金标准。\n💡 建议：连接至“下游任务”节点的 Label/GT 端口。'
      }
    ],
    parameters: [
      {
        id: 'csv_path',
        name: 'CSV路径',
        type: 'path',
        description: 'CSV文件绝对路径',
        required: true
      },
      {
        id: 'feature_columns',
        name: '特征列',
        type: 'list',
        description: '作为输入特征的列名列表'
      },
      {
        id: 'label_column',
        name: '标签列',
        type: 'string',
        description: '用于训练目标的标签列名',
        defaultValue: 'label'
      }
    ],
    codeTemplate: 'clinical_csv',
    tags: ['input', 'clinical', 'tabular'],
    tooltip: '加载临床指标。要求：CSV文件，建议使用UTF-8编码，表头使用英文'
  },

  'medical_report': {
    id: 'medical_report',
    type: 'input',
    name: 'Medical Report',
    description: '加载医学诊断报告 (纯文本)',
    icon: 'FileText',
    inputs: [],
    outputs: [
      {
        id: 'text',
        name: 'Text',
        type: 'text',
        description: '📜 原始诊断报告文本流。\n💡 建议：必须连接至 BERT 或 CLIP 编码器。'
      }
    ],
    parameters: [
      {
        id: 'csv_path',
        name: 'CSV路径',
        type: 'path',
        description: '包含报告文本的 CSV 文件路径',
        required: true
      },
      {
        id: 'text_column',
        name: '报告列名',
        type: 'string',
        defaultValue: 'report',
        description: '存放诊断报告文本的列名'
      },
      {
        id: 'language',
        name: '语言',
        type: 'select',
        options: [
          { label: '中文', value: 'zh' },
          { label: '英文', value: 'en' }
        ],
        defaultValue: 'zh'
      }
    ],
    codeTemplate: 'medical_report',
    tags: ['input', 'text', 'nlp'],
    tooltip: '加载非结构化的医生诊断报告文本。'
  },

  'segmentation_dataset': {
    id: 'segmentation_dataset',
    type: 'input',
    name: 'Segmentation Dataset',
    description: '加载图像分割数据集',
    icon: 'LayoutGrid',
    inputs: [],
    outputs: [
      {
        id: 'images',
        name: 'Images',
        type: 'image',
        description: '🖼️ 训练原图流 [B, 3, H, W]。\n💡 建议：连接至编码器（如 ResNet）的 Input。'
      },
      {
        id: 'masks',
        name: 'Masks',
        type: 'mask',
        description: '🎭 分割掩码 (Label) [B, 1, H, W]。\n💡 建议：直接连接至“分割头 (Segmentation Head)”的 Ground Truth 端口。'
      }
    ],
    parameters: [
      {
        id: 'images_path',
        name: '图像文件夹',
        type: 'path',
        description: '包含原始训练图片的路径',
        required: true
      },
      {
        id: 'masks_path',
        name: '掩码文件夹',
        type: 'path',
        description: '包含对应分割标签(Mask)的路径',
        required: true
      }
    ],
    codeTemplate: 'segmentation_dataset',
    tags: ['input', 'segmentation'],
    tooltip: '加载分割数据。要求：两个文件夹内的文件名需一一对应。'
  },

  // ==================== Transform Nodes ====================
  'resize': {
    id: 'resize',
    type: 'transform',
    name: 'Resize',
    description: '调整图像大小',
    icon: 'Maximize',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 待处理的原始图像。'
      }
    ],
    outputs: [
      {
        id: 'output',
        name: 'Output',
        type: 'image',
        shape: { batch: null, channels: 3, height: 224, width: 224 },
        description: '🖼️ 调整尺寸后的图像。'
      }
    ],
    parameters: [
      {
        id: 'size',
        name: '目标尺寸',
        type: 'number',
        description: '输出图像尺寸',
        defaultValue: 224,
        min: 32,
        max: 1024,
        step: 32
      },
      {
        id: 'interpolation',
        name: '插值方法',
        type: 'select',
        description: '插值算法',
        defaultValue: 'bilinear',
        options: [
          { label: 'Bilinear', value: 'bilinear' },
          { label: 'Bicubic', value: 'bicubic' },
          { label: 'Nearest', value: 'nearest' }
        ]
      }
    ],
    codeTemplate: 'resize',
    tags: ['transform', 'image'],
    tooltip: '将图像调整为指定尺寸'
  },

  'normalize': {
    id: 'normalize',
    type: 'transform',
    name: 'Normalize',
    description: '图像归一化',
    icon: 'Sliders',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 待处理图像。'
      }
    ],
    outputs: [
      {
        id: 'output',
        name: 'Output',
        type: 'image',
        description: '🖼️ 归一化后的图像（各通道符合 0-1 或指定分布）。'
      }
    ],
    parameters: [
      {
        id: 'mean',
        name: '均值',
        type: 'list',
        description: '各通道均值',
        defaultValue: [0.485, 0.456, 0.406]
      },
      {
        id: 'std',
        name: '标准差',
        type: 'list',
        description: '各通道标准差',
        defaultValue: [0.229, 0.224, 0.225]
      }
    ],
    codeTemplate: 'normalize',
    tags: ['transform', 'image', 'normalization']
  },

  'stain_normalization': {
    id: 'stain_normalization',
    type: 'transform',
    name: 'Stain Normalization',
    description: '病理图像染色归一化',
    icon: 'Palette',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🔬 原始病理图像（通常包含 H&E 染色）。'
      }
    ],
    outputs: [
      {
        id: 'output',
        name: 'Output',
        type: 'image',
        description: '🔬 染色风格统一后的图像。'
      }
    ],
    parameters: [
      {
        id: 'method',
        name: '方法',
        type: 'select',
        description: '染色归一化方法',
        defaultValue: 'macenko',
        options: [
          { label: 'Macenko', value: 'macenko' },
          { label: 'Reinhard', value: 'reinhard' },
          { label: 'Vahadane', value: 'vahadane' }
        ]
      },
      {
        id: 'reference_image',
        name: '参考图像',
        type: 'path',
        description: '参考图像路径（可选）'
      }
    ],
    codeTemplate: 'stain_normalization',
    tags: ['transform', 'pathology', 'stain'],
    tooltip: '对病理图像进行染色归一化处理'
  },

  'data_augmentation': {
    id: 'data_augmentation',
    type: 'transform',
    name: 'Data Augmentation',
    description: '数据增强',
    icon: 'Shuffle',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 原始图像。'
      }
    ],
    outputs: [
      {
        id: 'output',
        name: 'Output',
        type: 'image',
        description: '🎲 经过随机变换（旋转、翻转等）后的图像。'
      }
    ],
    parameters: [
      {
        id: 'horizontal_flip',
        name: '水平翻转',
        type: 'boolean',
        description: '随机水平翻转',
        defaultValue: true
      },
      {
        id: 'rotation',
        name: '旋转角度',
        type: 'number',
        description: '随机旋转角度',
        defaultValue: 15,
        min: 0,
        max: 90
      },
      {
        id: 'color_jitter',
        name: '颜色抖动',
        type: 'boolean',
        description: '随机颜色抖动',
        defaultValue: true
      }
    ],
    codeTemplate: 'data_augmentation',
    tags: ['transform', 'augmentation']
  },

  // ==================== Encoder Nodes ====================
  'resnet50': {
    id: 'resnet50',
    type: 'encoder',
    name: 'ResNet50',
    description: 'ResNet50特征提取器',
    icon: 'Layers',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 图像输入。请连接“数据输入”或“预处理”节点的图像输出。'
      }
    ],
    outputs: [
      {
        id: 'features',
        name: 'Global Features',
        type: 'embedding',
        shape: { batch: null, dim: 2048 },
        description: '📝 全局特征向量 (Embedding)。\n这是对整张图的“总结”，丢失了位置信息。\n💡 建议：连接至“分类头”或“生存分析头”。'
      },
      {
        id: 'feature_map',
        name: 'Spatial Feature Map',
        type: 'features',
        description: '🗺️ 空间特征图 (Spatial Map)。\n保留了物体在图中的位置信息。\n💡 建议：仅用于“分割头(Segmentation Head)”。'
      }
    ],
    parameters: [
      {
        id: 'pretrained',
        name: '预训练',
        type: 'boolean',
        description: '使用ImageNet预训练权重',
        defaultValue: true
      },
      {
        id: 'freeze',
        name: '冻结权重',
        type: 'boolean',
        description: '冻结骨干网络权重',
        defaultValue: false
      }
    ],
    codeTemplate: 'resnet50',
    tags: ['encoder', 'cnn', 'resnet'],
    paperUrl: 'https://arxiv.org/abs/1512.03385',
    tooltip: '经典的ResNet50卷积神经网络'
  },

  'vit': {
    id: 'vit',
    type: 'encoder',
    name: 'Vision Transformer',
    description: 'ViT特征提取器',
    icon: 'Grid3x3',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 图像输入。'
      }
    ],
    outputs: [
      {
        id: 'features',
        name: 'Global Features',
        type: 'embedding',
        shape: { batch: null, dim: 768 },
        description: '📝 全局特征向量 (CLS Token)。\n💡 建议：连接至“分类头”或“生存分析头”。'
      },
      {
        id: 'feature_map',
        name: 'Spatial Feature Map',
        type: 'features',
        description: '🗺️ 空间特征图 (Patch Embeddings)。\n💡 建议：仅用于“分割头”。'
      }
    ],
    parameters: [
      {
        id: 'model_size',
        name: '模型大小',
        type: 'select',
        description: 'ViT模型变体',
        defaultValue: 'base',
        options: [
          { label: 'ViT-Base', value: 'base' },
          { label: 'ViT-Large', value: 'large' },
          { label: 'ViT-Huge', value: 'huge' }
        ]
      },
      {
        id: 'pretrained',
        name: '预训练',
        type: 'boolean',
        description: '使用预训练权重',
        defaultValue: true
      }
    ],
    codeTemplate: 'vit',
    tags: ['encoder', 'transformer', 'vit'],
    paperUrl: 'https://arxiv.org/abs/2010.11929',
    tooltip: 'Vision Transformer，基于自注意力的视觉模型'
  },

  'swin': {
    id: 'swin',
    type: 'encoder',
    name: 'Swin Transformer',
    description: '层次化视觉Transformer (非常适合医学图像)',
    icon: 'Trello',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 图像输入。'
      }
    ],
    outputs: [
      {
        id: 'features',
        name: 'Global Features',
        type: 'embedding',
        shape: { batch: null, dim: 1024 },
        description: '📝 全局特征向量。\n💡 建议：连接至“分类头”。'
      },
      {
        id: 'feature_map',
        name: 'Spatial Feature Map',
        type: 'features',
        description: '🗺️ 层次化特征图。非常适合高精度的医学影像分割任务。'
      }
    ],
    parameters: [
      {
        id: 'variant',
        name: '模型变体',
        type: 'select',
        options: [
          { label: 'Swin-Tiny', value: 'tiny' },
          { label: 'Swin-Small', value: 'small' },
          { label: 'Swin-Base', value: 'base' }
        ],
        defaultValue: 'base'
      },
      {
        id: 'pretrained',
        name: '预训练',
        type: 'boolean',
        defaultValue: true
      }
    ],
    codeTemplate: 'swin',
    tags: ['encoder', 'transformer', 'medical-favorite'],
    tooltip: 'Swin Transformer 通过移动窗口实现层次化特征提取，是目前医学影像分割和分类的顶流模型。'
  },

  'efficientnet': {
    id: 'efficientnet',
    type: 'encoder',
    name: 'EfficientNet V2',
    description: '兼顾精度与速度的卷积神经网络',
    icon: 'Zap',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 图像输入。'
      }
    ],
    outputs: [
      {
        id: 'features',
        name: 'Global Features',
        type: 'embedding',
        description: '📝 全局特征向量。\n💡 建议：连接至“分类头”。'
      }
    ],
    parameters: [
      {
        id: 'model_type',
        name: '模型规模',
        type: 'select',
        options: [
          { label: 'EfficientNet-S', value: 's' },
          { label: 'EfficientNet-M', value: 'm' },
          { label: 'EfficientNet-L', value: 'l' }
        ],
        defaultValue: 's'
      },
      {
        id: 'pretrained',
        name: '预训练',
        type: 'boolean',
        defaultValue: true
      }
    ],
    codeTemplate: 'efficientnet',
    tags: ['encoder', 'cnn', 'efficient'],
    tooltip: 'EfficientNet V2 是卷积神经网络的集大成者，在保证精度的同时显著减少了显存占用。'
  },

  'uni': {
    id: 'uni',
    type: 'encoder',
    name: 'UNI (Pathology)',
    description: '哈佛大学开发的超强病理基础模型',
    icon: 'Crown',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 图像块输入（通常为 224x224）。'
      }
    ],
    outputs: [
      {
        id: 'features',
        name: 'Global Features',
        type: 'embedding',
        shape: { batch: null, dim: 1024 },
        description: '🧬 1024维病理表征向量。\n💡 建议：连接至“分类头”或“特征融合”。'
      }
    ],
    parameters: [
      {
        id: 'model_path',
        name: '模型路径',
        type: 'path',
        description: 'UNI模型权重路径',
        required: true
      }
    ],
    codeTemplate: 'uni',
    tags: ['encoder', 'foundation', 'pathology', 'hot'],
    tooltip: 'UNI 是目前病理学领域表现最好的基础模型之一，经过海量病理切片预训练。'
  },

  'titan': {
    id: 'titan',
    type: 'encoder',
    name: 'TITAN',
    description: 'TITAN病理基础模型',
    icon: 'Dna',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 图像块输入。'
      }
    ],
    outputs: [
      {
        id: 'features',
        name: 'Global Features',
        type: 'embedding',
        shape: { batch: null, dim: 768 },
        description: '📝 768维病理特征向量。\n💡 建议：连接至“分类头”或“特征融合”。'
      }
    ],
    parameters: [
      {
        id: 'model_path',
        name: '模型路径',
        type: 'path',
        description: 'TITAN模型权重路径',
        required: true
      },
      {
        id: 'freeze',
        name: '冻结权重',
        type: 'boolean',
        description: '冻结模型权重',
        defaultValue: false
      }
    ],
    codeTemplate: 'titan',
    tags: ['encoder', 'foundation', 'pathology', 'titan'],
    tooltip: 'TITAN病理学基础模型，专为病理图像设计'
  },

  'conch': {
    id: 'conch',
    type: 'encoder',
    name: 'CONCH',
    description: 'CONCH病理视觉语言模型',
    icon: 'Eye',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'image',
        required: true,
        description: '🖼️ 图像输入。'
      }
    ],
    outputs: [
      {
        id: 'features',
        name: 'Global Features',
        type: 'embedding',
        shape: { batch: null, dim: 512 },
        description: '📝 512维对齐特征向量。\n💡 建议：适用于图文对齐或病理分类。'
      }
    ],
    parameters: [
      {
        id: 'model_path',
        name: '模型路径',
        type: 'path',
        description: 'CONCH模型权重路径',
        required: true
      }
    ],
    codeTemplate: 'conch',
    tags: ['encoder', 'foundation', 'pathology', 'conch'],
    tooltip: 'CONCH视觉语言模型，支持病理图像和文本'
  },

  'bert': {
    id: 'bert',
    type: 'encoder',
    name: 'BERT',
    description: 'BERT文本编码器',
    icon: 'Type',
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'text',
        required: true,
        description: '📜 文本输入。请连接“医学报告”节点的输出。'
      }
    ],
    outputs: [
      {
        id: 'features',
        name: 'Global Features',
        type: 'embedding',
        shape: { batch: null, dim: 768 },
        description: '📝 文本嵌入向量 (Embedding)。\n将诊断报告转化为高维语义特征。\n💡 建议：连接至“特征融合”或“分类头”。'
      }
    ],
    parameters: [
      {
        id: 'model_name',
        name: '模型名称',
        type: 'select',
        description: 'BERT模型变体',
        defaultValue: 'bert-base-uncased',
        options: [
          { label: 'BERT-Base', value: 'bert-base-uncased' },
          { label: 'BERT-Large', value: 'bert-large-uncased' },
          { label: 'BioBERT', value: 'dmis-lab/biobert-base-cased-v1.2' }
        ]
      },
      {
        id: 'max_length',
        name: '最大长度',
        type: 'number',
        description: '最大序列长度',
        defaultValue: 512,
        min: 64,
        max: 2048,
        step: 64
      }
    ],
    codeTemplate: 'bert',
    tags: ['encoder', 'text', 'bert'],
    paperUrl: 'https://arxiv.org/abs/1810.04805',
    tooltip: 'BERT文本编码器，支持BioBERT医学版本'
  },

  'clip': {
    id: 'clip',
    type: 'encoder',
    name: 'CLIP (OpenAI)',
    description: '对比语言-图像预训练模型 (图文对齐神器)',
    icon: 'ImagePlus',
    inputs: [
      {
        id: 'image',
        name: 'Image Input',
        type: 'image',
        required: true,
        description: '🖼️ 图像数据输入。\n💡 建议：连接“数据输入”或“预处理”节点的图像输出。'
      },
      {
        id: 'text',
        name: 'Text Input',
        type: 'text',
        required: true,
        description: '📜 医学报告文本输入。\n💡 建议：连接“医学报告 (Medical Report)”节点。'
      }
    ],
    outputs: [
      {
        id: 'image_features',
        name: 'Visual Feats',
        type: 'embedding',
        description: '📝 对齐后的视觉特征向量。\n💡 建议：连接至“特征融合”节点。'
      },
      {
        id: 'text_features',
        name: 'Textual Feats',
        type: 'embedding',
        description: '📝 对齐后的文本特征向量。\n💡 建议：连接至“特征融合”节点。'
      }
    ],
    parameters: [
      {
        id: 'model_variant',
        name: '模型规模',
        type: 'select',
        options: [
          { label: 'CLIP-ViT-B/32', value: 'openai/clip-vit-base-patch32' },
          { label: 'CLIP-ViT-L/14', value: 'openai/clip-vit-large-patch14' }
        ],
        defaultValue: 'openai/clip-vit-base-patch32'
      },
      {
        id: 'freeze',
        name: '冻结权重',
        type: 'boolean',
        defaultValue: true
      }
    ],
    codeTemplate: 'clip',
    tags: ['encoder', 'multimodal', 'foundation', 'hot'],
    tooltip: 'CLIP 通过对比学习将图像和文本映射到同一个特征空间，是目前图文理解最强的基础模型。'
  },

  // ==================== Fusion Nodes ====================
  'concat': {
    id: 'concat',
    type: 'fusion',
    name: 'Concatenate',
    description: '特征拼接',
    icon: 'Combine',
    inputs: [
      {
        id: 'input1',
        name: 'Input 1',
        type: 'embedding',
        required: true,
        description: '📝 第一个特征流（如图像特征）。'
      },
      {
        id: 'input2',
        name: 'Input 2',
        type: 'embedding',
        required: true,
        description: '📊 第二个特征流（如临床特征）。'
      }
    ],
    outputs: [
      {
        id: 'output',
        name: 'Output',
        type: 'embedding',
        description: '📝 拼接后的长特征向量。\n💡 建议：连接至分类头。'
      }
    ],
    parameters: [
      {
        id: 'dim',
        name: '拼接维度',
        type: 'number',
        description: '沿哪个维度拼接',
        defaultValue: -1,
        min: -2,
        max: 2
      }
    ],
    codeTemplate: 'concat',
    tags: ['fusion', 'concat']
  },

  'cross_attention': {
    id: 'cross_attention',
    type: 'fusion',
    name: 'Cross Attention',
    description: '交叉注意力融合',
    icon: 'GitMerge',
    inputs: [
      {
        id: 'query',
        name: 'Query',
        type: 'embedding',
        required: true,
        description: '📝 作为查询(Query)的模态（通常为主模态，如图像特征）。'
      },
      {
        id: 'key_value',
        name: 'Key/Value',
        type: 'embedding',
        required: true,
        description: '📝 作为键值(Key/Value)的模态（通常为辅助模态，如文本特征）。'
      }
    ],
    outputs: [
      {
        id: 'output',
        name: 'Output',
        type: 'embedding',
        description: '📝 经过交叉注意力对齐后的融合特征。\n💡 建议：连接至分类头。'
      }
    ],
    parameters: [
      {
        id: 'num_heads',
        name: '注意力头数',
        type: 'number',
        description: '多头注意力头数',
        defaultValue: 8,
        min: 1,
        max: 32
      },
      {
        id: 'dropout',
        name: 'Dropout',
        type: 'number',
        description: 'Dropout比率',
        defaultValue: 0.1,
        min: 0,
        max: 0.5,
        step: 0.1
      }
    ],
    codeTemplate: 'cross_attention',
    tags: ['fusion', 'attention'],
    tooltip: '使用交叉注意力机制融合两种模态的特征。适用于图像与文本的对齐。'
  },

  'gated_fusion': {
    id: 'gated_fusion',
    type: 'fusion',
    name: 'Gated Fusion',
    description: '门控融合 (自动学习模态权重)',
    icon: 'Lock',
    inputs: [
      {
        id: 'input1',
        name: 'Modal 1',
        type: 'embedding',
        required: true,
        description: '📝 第一个模态的特征向量。\n💡 建议：通常连接图像特征。'
      },
      {
        id: 'input2',
        name: 'Modal 2',
        type: 'embedding',
        required: true,
        description: '📝 第二个模态的特征向量。\n💡 建议：通常连接文本或临床特征。'
      }
    ],
    outputs: [
      {
        id: 'output',
        name: 'Output',
        type: 'embedding',
        description: '📝 通过门控权重加权后的融合特征。\n系统会自动决定两个模态的贡献比例。'
      }
    ],
    parameters: [
      {
        id: 'gate_type',
        name: '门控类型',
        type: 'select',
        options: [
          { label: 'Sigmoid Gate', value: 'sigmoid' },
          { label: 'Softmax Weighted', value: 'softmax' }
        ],
        defaultValue: 'sigmoid'
      }
    ],
    codeTemplate: 'gated_fusion',
    tags: ['fusion', 'gated', 'multimodal'],
    tooltip: '门控机制可以自动学习哪个模态更重要。例如，在某些病例中临床数据更重要，而在另一些病例中图像更重要。'
  },

  'attention_mil': {
    id: 'attention_mil',
    type: 'fusion',
    name: 'Attention MIL',
    description: '注意力MIL聚合',
    icon: 'Focus',
    inputs: [
      {
        id: 'patches',
        name: 'Patches',
        type: 'embedding',
        description: '🧩 多个 Patch 的特征集合 [N, D]。\n💡 建议：连接编码器的 Global Features。',
        required: true
      }
    ],
    outputs: [
      {
        id: 'features',
        name: 'Features',
        type: 'embedding',
        shape: { batch: null, dim: 512 },
        description: '📝 聚合后的整张切片特征 [B, 512]。'
      },
      {
        id: 'attention',
        name: 'Attention',
        type: 'attention',
        description: '👁️ 注意力权重 [B, N]。\n显示每个 Patch 对诊断的重要性。\n💡 建议：用于生成预测热力图。'
      }
    ],
    parameters: [
      {
        id: 'hidden_dim',
        name: '隐藏层维度',
        type: 'number',
        description: '注意力网络隐藏层维度',
        defaultValue: 256,
        min: 64,
        max: 1024
      },
      {
        id: 'attention_branches',
        name: '注意力分支',
        type: 'number',
        description: '注意力分支数',
        defaultValue: 1,
        min: 1,
        max: 8
      }
    ],
    codeTemplate: 'attention_mil',
    tags: ['fusion', 'mil', 'pathology', 'attention'],
    tooltip: 'Attention-based Multiple Instance Learning，用于病理WSI分析'
  },

  // ==================== Head Nodes ====================
  'classifier': {
    id: 'classifier',
    type: 'head',
    name: 'Classifier',
    description: '分类头',
    icon: 'Tags',
    inputs: [
      {
        id: 'features',
        name: 'Features',
        type: 'embedding',
        required: true,
        description: '📝 特征输入。\n💡 建议：连接编码器（如 ResNet）的 [Global Features] 端口。'
      }
    ],
    outputs: [
      {
        id: 'logits',
        name: 'Logits',
        type: 'tensor',
        description: '分类logits'
      },
      {
        id: 'predictions',
        name: 'Predictions',
        type: 'label',
        description: '预测结果'
      }
    ],
    parameters: [
      {
        id: 'num_classes',
        name: '类别数',
        type: 'number',
        description: '分类类别数',
        defaultValue: 2,
        min: 2,
        max: 1000
      },
      {
        id: 'hidden_dims',
        name: '隐藏层',
        type: 'list',
        description: 'MLP隐藏层维度',
        defaultValue: [512, 256]
      },
      {
        id: 'dropout',
        name: 'Dropout',
        type: 'number',
        description: 'Dropout比率',
        defaultValue: 0.3,
        min: 0,
        max: 0.8,
        step: 0.1
      }
    ],
    codeTemplate: 'classifier',
    tags: ['head', 'classification']
  },

  'survival_head': {
    id: 'survival_head',
    type: 'head',
    name: 'Survival Head',
    description: '生存分析头',
    icon: 'Activity',
    inputs: [
      {
        id: 'features',
        name: 'Features',
        type: 'embedding',
        required: true,
        description: '📝 特征输入。\n💡 建议：连接多模态融合后或单模态的全局特征。'
      }
    ],
    outputs: [
      {
        id: 'risk_score',
        name: 'Risk Score',
        type: 'tensor',
        description: '📈 生存风险评分。\n分数越高代表生存风险越大（预后越差）。'
      }
    ],
    parameters: [
      {
        id: 'num_intervals',
        name: '时间区间数',
        type: 'number',
        description: '生存时间离散区间数',
        defaultValue: 10,
        min: 2,
        max: 100
      },
      {
        id: 'loss_type',
        name: '损失函数',
        type: 'select',
        description: '生存分析损失函数',
        defaultValue: 'nll',
        options: [
          { label: 'NLL Loss', value: 'nll' },
          { label: 'Cox Loss', value: 'cox' },
          { label: 'DeepHit', value: 'deephit' }
        ]
      }
    ],
    codeTemplate: 'survival_head',
    tags: ['head', 'survival', 'medical'],
    tooltip: '生存分析预测头，支持多种生存损失函数'
  },

  'segmentation_head': {
    id: 'segmentation_head',
    type: 'head',
    name: 'Segmentation Head',
    description: '分割头',
    icon: 'LayoutGrid',
    inputs: [
      {
        id: 'features',
        name: 'Features',
        type: 'features',
        required: true,
        description: '🗺️ 特征图输入。\n💡 建议：必须连接编码器的 [Spatial Feature Map] 输出端口。'
      },
      {
        id: 'masks',
        name: 'Ground Truth',
        type: 'mask',
        required: false,
        description: '🎭 标签输入。\n💡 建议：连接数据集（如 Segmentation Dataset）的 [Masks] 端口。'
      }
    ],
    outputs: [
      {
        id: 'mask',
        name: 'Mask',
        type: 'image',
        description: '分割掩码'
      }
    ],
    parameters: [
      {
        id: 'num_classes',
        name: '类别数',
        type: 'number',
        description: '分割类别数（含背景）',
        defaultValue: 2,
        min: 2,
        max: 100
      },
      {
        id: 'decoder_type',
        name: '解码器类型',
        type: 'select',
        description: '上采样解码器',
        defaultValue: 'fcn',
        options: [
          { label: 'FCN', value: 'fcn' },
          { label: 'U-Net', value: 'unet' },
          { label: 'DeepLab', value: 'deeplab' }
        ]
      }
    ],
    codeTemplate: 'segmentation_head',
    tags: ['head', 'segmentation']
  },

  'sam_segmentor': {
    id: 'sam_segmentor',
    type: 'head',
    name: 'SAM Segmentor',
    description: 'Segment Anything Model (大模型自动分割)',
    icon: 'Sparkles',
    inputs: [
      {
        id: 'image',
        name: 'Image',
        type: 'image',
        required: true,
        description: '连接待分割的原始图像端口。'
      }
    ],
    outputs: [
      {
        id: 'masks',
        name: 'Auto Masks',
        type: 'mask',
        description: 'SAM 自动生成的分割掩码。'
      }
    ],
    parameters: [
      {
        id: 'model_type',
        name: '模型规模',
        type: 'select',
        options: [
          { label: 'ViT-H (最高精度)', value: 'vit_h' },
          { label: 'ViT-L (中等平衡)', value: 'vit_l' },
          { label: 'ViT-B (速度最快)', value: 'vit_b' }
        ],
        defaultValue: 'vit_b'
      },
      {
        id: 'points_per_side',
        name: '点密度',
        type: 'number',
        defaultValue: 32,
        description: '每边生成的采样点数量。点数越多，分割越细，但速度越慢。'
      }
    ],
    codeTemplate: 'sam_segmentor',
    tags: ['foundation', 'segmentation', 'zero-shot'],
    tooltip: '无需标注，利用 Meta SAM 大模型实现全自动“万物皆可割”。'
  },

  // ==================== Config Nodes ====================
  'optimizer': {
    id: 'optimizer',
    type: 'config',
    name: 'Optimizer',
    description: '优化器配置',
    icon: 'Settings',
    inputs: [],
    outputs: [
      {
        id: 'config',
        name: 'Config',
        type: 'any',
        description: '⚙️ 优化器超参数配置。'
      }
    ],
    parameters: [
      {
        id: 'type',
        name: '优化器',
        type: 'select',
        description: '优化器类型',
        defaultValue: 'adamw',
        options: [
          { label: 'Adam', value: 'adam' },
          { label: 'AdamW', value: 'adamw' },
          { label: 'SGD', value: 'sgd' },
          { label: 'AdamW8bit', value: 'adamw8bit' }
        ]
      },
      {
        id: 'lr',
        name: '学习率',
        type: 'number',
        description: 'Learning Rate',
        defaultValue: 0.0001,
        min: 0.0000001,
        max: 0.1,
        step: 0.0001
      },
      {
        id: 'weight_decay',
        name: '权重衰减',
        type: 'number',
        description: 'Weight Decay',
        defaultValue: 0.01,
        min: 0,
        max: 0.1,
        step: 0.001,
        advanced: true
      }
    ],
    codeTemplate: 'optimizer',
    tags: ['config', 'optimizer', 'training']
  },

  'scheduler': {
    id: 'scheduler',
    type: 'config',
    name: 'LR Scheduler',
    description: '学习率调度器',
    icon: 'TrendingDown',
    inputs: [],
    outputs: [
      {
        id: 'config',
        name: 'Config',
        type: 'any',
        description: '📉 学习率变化策略配置。'
      }
    ],
    parameters: [
      {
        id: 'type',
        name: '调度器',
        type: 'select',
        description: '学习率调度策略',
        defaultValue: 'cosine',
        options: [
          { label: 'Step', value: 'step' },
          { label: 'Cosine', value: 'cosine' },
          { label: 'ReduceLROnPlateau', value: 'plateau' },
          { label: 'Warmup + Cosine', value: 'warmup_cosine' }
        ]
      },
      {
        id: 'warmup_epochs',
        name: 'Warmup轮数',
        type: 'number',
        description: '预热轮数',
        defaultValue: 5,
        min: 0,
        max: 50,
        advanced: true
      }
    ],
    codeTemplate: 'scheduler',
    tags: ['config', 'scheduler', 'training']
  },

  'loss_function': {
    id: 'loss_function',
    type: 'config',
    name: 'Loss Function',
    description: '损失函数配置',
    icon: 'Target',
    inputs: [],
    outputs: [
      {
        id: 'config',
        name: 'Config',
        type: 'any',
        description: '🎯 损失函数（优化目标）配置。'
      }
    ],
    parameters: [
      {
        id: 'type',
        name: '损失函数',
        type: 'select',
        description: '损失函数类型',
        defaultValue: 'cross_entropy',
        options: [
          { label: 'Cross Entropy', value: 'cross_entropy' },
          { label: 'BCE', value: 'bce' },
          { label: 'Focal Loss', value: 'focal' },
          { label: 'Dice Loss', value: 'dice' },
          { label: 'Contrastive Loss', value: 'contrastive' }
        ]
      },
      {
        id: 'weight',
        name: '权重',
        type: 'number',
        description: '损失权重',
        defaultValue: 1.0,
        min: 0,
        max: 10,
        step: 0.1
      }
    ],
    codeTemplate: 'loss_function',
    tags: ['config', 'loss', 'training']
  },

  'training_config': {
    id: 'training_config',
    type: 'config',
    name: 'Training Config',
    description: '训练参数配置',
    icon: 'SlidersHorizontal',
    inputs: [],
    outputs: [
      {
        id: 'config',
        name: 'Config',
        type: 'any',
        description: '🚀 训练基础配置（Epochs, Batch Size等）。'
      }
    ],
    parameters: [
      {
        id: 'batch_size',
        name: 'Batch Size',
        type: 'number',
        description: '批次大小',
        defaultValue: 32,
        min: 1,
        max: 512
      },
      {
        id: 'epochs',
        name: 'Epochs',
        type: 'number',
        description: '训练轮数',
        defaultValue: 100,
        min: 1,
        max: 10000
      },
      {
        id: 'gradient_clip',
        name: '梯度裁剪',
        type: 'number',
        description: '梯度裁剪阈值',
        defaultValue: 1.0,
        min: 0,
        max: 10,
        step: 0.1,
        advanced: true
      }
    ],
    codeTemplate: 'training_config',
    tags: ['config', 'training']
  }
};

// 获取节点定义
export function getNodeDefinition(nodeType: string): NodeDefinition | undefined {
  return nodeRegistry[nodeType];
}

// 获取所有节点定义
export function getAllNodeDefinitions(): NodeDefinition[] {
  return Object.values(nodeRegistry);
}

// 按分类获取节点
export function getNodesByCategory(category: string): NodeDefinition[] {
  return Object.values(nodeRegistry).filter(node => node.type === category);
}

// 搜索节点
export function searchNodes(query: string): NodeDefinition[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(nodeRegistry).filter(node => 
    node.name.toLowerCase().includes(lowerQuery) ||
    node.description.toLowerCase().includes(lowerQuery) ||
    node.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
