"""
代码模板定义 - Jinja2模板
"""

# main.py 模板
MAIN_PY_TEMPLATE = '''"""
自动生成的训练脚本
由 Medical AI Workflow 平台生成
"""
import os
import yaml
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.model_selection import train_test_split
import numpy as np
from tqdm import tqdm

from model import MedicalAIModel
from dataset import MedicalDataset


def load_config(config_path='config.yaml'):
    """加载配置文件"""
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def train_epoch(model, dataloader, criterion, optimizer, device):
    """训练一个epoch"""
    model.train()
    total_loss = 0
    correct = 0
    total = 0
    
    pbar = tqdm(dataloader, desc='Training')
    for batch_idx, (data, target) in enumerate(pbar):
        data, target = data.to(device), target.to(device)
        
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        {% if task_type == 'classification' %}
        pred = output.argmax(dim=1)
        correct += pred.eq(target).sum().item()
        total += target.size(0)
        acc = 100. * correct / total
        pbar.set_postfix({'loss': f'{total_loss/(batch_idx+1):.4f}', 'acc': f'{acc:.2f}%'})
        {% else %}
        pbar.set_postfix({'loss': f'{total_loss/(batch_idx+1):.4f}'})
        {% endif %}
    
    return total_loss / len(dataloader)


def validate(model, dataloader, criterion, device):
    """验证模型"""
    model.eval()
    total_loss = 0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for data, target in tqdm(dataloader, desc='Validation'):
            data, target = data.to(device), target.to(device)
            output = model(data)
            loss = criterion(output, target)
            
            total_loss += loss.item()
            {% if task_type == 'classification' %}
            pred = output.argmax(dim=1)
            correct += pred.eq(target).sum().item()
            total += target.size(0)
    
    acc = 100. * correct / total if total > 0 else 0
    return total_loss / len(dataloader), acc
    {% else %}
    
    return total_loss / len(dataloader), 0
    {% endif %}


def main():
    # 加载配置
    config = load_config()
    
    # 设置设备
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'Using device: {device}')
    
    # 创建数据集
    train_dataset = MedicalDataset(
        data_dir=config['data']['train_dir'],
        transform=True,
        split='train'
    )
    val_dataset = MedicalDataset(
        data_dir=config['data']['val_dir'],
        transform=False,
        split='val'
    )
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['training']['batch_size'],
        shuffle=True,
        num_workers=config['data']['num_workers'],
        pin_memory=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=config['training']['batch_size'],
        shuffle=False,
        num_workers=config['data']['num_workers'],
        pin_memory=True
    )
    
    # 创建模型
    model = MedicalAIModel(config).to(device)
    print(f'Model parameters: {sum(p.numel() for p in model.parameters()):,}')
    
    # 损失函数和优化器
    criterion = nn.{{ loss_function }}()
    optimizer = torch.optim.{{ optimizer }}(
        model.parameters(),
        lr=config['training']['learning_rate'],
        weight_decay=config['training']['weight_decay']
    )
    
    # 学习率调度器
    scheduler = torch.optim.lr_scheduler.{{ scheduler }}(
        optimizer,
        T_max=config['training']['epochs']
    )
    
    # 训练循环
    best_val_metric = 0
    for epoch in range(config['training']['epochs']):
        print(f'\\nEpoch {epoch+1}/{config["training"]["epochs"]}')
        
        train_loss = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_metric = validate(model, val_loader, criterion, device)
        
        scheduler.step()
        
        print(f'Train Loss: {train_loss:.4f}')
        print(f'Val Loss: {val_loss:.4f}')
        {% if task_type == 'classification' %}
        print(f'Val Accuracy: {val_metric:.2f}%')
        {% endif %}
        
        # 保存最佳模型
        {% if task_type == 'classification' %}
        if val_metric > best_val_metric:
            best_val_metric = val_metric
            torch.save(model.state_dict(), 'best_model.pth')
            print(f'Saved best model with accuracy: {val_metric:.2f}%')
        {% else %}
        if val_loss < best_val_metric or best_val_metric == 0:
            best_val_metric = val_loss
            torch.save(model.state_dict(), 'best_model.pth')
            print(f'Saved best model with loss: {val_loss:.4f}')
        {% endif %}
    
    print('\\nTraining completed!')


if __name__ == '__main__':
    main()
'''

# model.py 模板
MODEL_PY_TEMPLATE = '''"""
自动生成的模型定义
由 Medical AI Workflow 平台生成
"""
import torch
import torch.nn as nn
import torchvision.models as models
from transformers import AutoModel, AutoTokenizer


class MedicalAIModel(nn.Module):
    """
    医学AI模型
    自动生成的架构
    """
    
    def __init__(self, config):
        super(MedicalAIModel, self).__init__()
        
        # 构建编码器（骨干网络）
        self.encoder = self._build_encoder(config)
        
        # 构建特征融合层（如果有）
        self.fusion = self._build_fusion(config)
        
        # 构建任务头
        self.head = self._build_head(config)
        
    def _build_encoder(self, config):
        """构建特征编码器"""
        encoders = nn.ModuleDict()
        
        {% for encoder in encoders %}
        # {{ encoder.name }}
        {% if encoder.type == 'resnet50' %}
        encoder_{{ loop.index }} = models.resnet50(pretrained={{ encoder.pretrained }})
        {% if encoder.freeze %}
        for param in encoder_{{ loop.index }}.parameters():
            param.requires_grad = False
        {% endif %}
        encoder_{{ loop.index }}.fc = nn.Identity()
        encoders['{{ encoder.id }}'] = encoder_{{ loop.index }}
        
        {% elif encoder.type == 'vit' %}
        from timm import create_model
        encoder_{{ loop.index }} = create_model(
            'vit_{{ encoder.model_size }}_patch16_224',
            pretrained={{ encoder.pretrained }},
            num_classes=0
        )
        {% if encoder.freeze %}
        for param in encoder_{{ loop.index }}.parameters():
            param.requires_grad = False
        {% endif %}
        encoders['{{ encoder.id }}'] = encoder_{{ loop.index }}
        
        {% elif encoder.type == 'titan' %}
        # TITAN病理基础模型
        encoder_{{ loop.index }} = TITANEncoder(model_path='{{ encoder.model_path }}')
        {% if encoder.freeze %}
        for param in encoder_{{ loop.index }}.parameters():
            param.requires_grad = False
        {% endif %}
        encoders['{{ encoder.id }}'] = encoder_{{ loop.index }}
        
        {% elif encoder.type == 'bert' %}
        encoder_{{ loop.index }} = AutoModel.from_pretrained('{{ encoder.model_name }}')
        {% if encoder.freeze %}
        for param in encoder_{{ loop.index }}.parameters():
            param.requires_grad = False
        {% endif %}
        encoders['{{ encoder.id }}'] = encoder_{{ loop.index }}
        {% endif %}
        {% endfor %}
        
        return encoders
    
    def _build_fusion(self, config):
        """构建特征融合层"""
        {% if fusion %}
        {% if fusion.type == 'concat' %}
        return nn.Sequential(
            nn.Linear({{ fusion.input_dim }}, {{ fusion.output_dim }}),
            nn.ReLU(),
            nn.Dropout(0.3)
        )
        {% elif fusion.type == 'attention_mil' %}
        return AttentionMIL(
            input_dim={{ fusion.input_dim }},
            hidden_dim={{ fusion.hidden_dim }},
            attention_branches={{ fusion.attention_branches }}
        )
        {% elif fusion.type == 'cross_attention' %}
        return CrossAttentionFusion(
            dim={{ fusion.dim }},
            num_heads={{ fusion.num_heads }},
            dropout={{ fusion.dropout }}
        )
        {% endif %}
        {% else %}
        return None
        {% endif %}
    
    def _build_head(self, config):
        """构建任务头"""
        {% for head in heads %}
        {% if head.type == 'classifier' %}
        layers = []
        in_dim = {{ head.input_dim }}
        {% for hidden_dim in head.hidden_dims %}
        layers.extend([
            nn.Linear(in_dim, {{ hidden_dim }}),
            nn.ReLU(),
            nn.Dropout({{ head.dropout }})
        ])
        in_dim = {{ hidden_dim }}
        {% endfor %}
        layers.append(nn.Linear(in_dim, {{ head.num_classes }}))
        return nn.Sequential(*layers)
        
        {% elif head.type == 'survival_head' %}
        return SurvivalHead(
            input_dim={{ head.input_dim }},
            num_intervals={{ head.num_intervals }},
            loss_type='{{ head.loss_type }}'
        )
        
        {% elif head.type == 'segmentation_head' %}
        return SegmentationHead(
            encoder_channels={{ head.encoder_channels }},
            num_classes={{ head.num_classes }},
            decoder_type='{{ head.decoder_type }}'
        )
        {% endif %}
        {% endfor %}
    
    def forward(self, x):
        """前向传播"""
        # 特征提取
        features = []
        {% for encoder in encoders %}
        feat_{{ loop.index }} = self.encoder['{{ encoder.id }}'](x)
        features.append(feat_{{ loop.index }})
        {% endfor %}
        
        # 特征融合
        {% if fusion %}
        {% if fusion.type == 'concat' %}
        x = torch.cat(features, dim=-1)
        x = self.fusion(x)
        {% elif fusion.type == 'attention_mil' %}
        x = self.fusion(features[0])  # MIL expects bag of features
        {% endif %}
        {% else %}
        x = features[0] if len(features) == 1 else torch.cat(features, dim=-1)
        {% endif %}
        
        # 任务头
        output = self.head(x)
        
        return output


{% if 'attention_mil' in fusion_types %}
class AttentionMIL(nn.Module):
    """注意力MIL聚合模块"""
    
    def __init__(self, input_dim=2048, hidden_dim=256, attention_branches=1):
        super(AttentionMIL, self).__init__()
        self.attention_branches = attention_branches
        
        self.attention = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, attention_branches)
        )
        
    def forward(self, x):
        """
        Args:
            x: [N, D] bag of features
        Returns:
            aggregated: [D] aggregated feature
            attention_weights: [N] attention weights
        """
        attention_weights = self.attention(x)  # [N, M]
        attention_weights = torch.softmax(attention_weights, dim=0)
        
        # 聚合
        aggregated = torch.mm(attention_weights.t(), x)  # [M, D]
        
        if self.attention_branches == 1:
            aggregated = aggregated.squeeze(0)
            attention_weights = attention_weights.squeeze(1)
        
        return aggregated, attention_weights
{% endif %}


{% if 'cross_attention' in fusion_types %}
class CrossAttentionFusion(nn.Module):
    """交叉注意力融合模块"""
    
    def __init__(self, dim, num_heads=8, dropout=0.1):
        super(CrossAttentionFusion, self).__init__()
        self.cross_attn = nn.MultiheadAttention(dim, num_heads, dropout=dropout)
        self.norm = nn.LayerNorm(dim)
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, query, key_value):
        """
        Args:
            query: [B, D]
            key_value: [B, D]
        """
        attn_output, _ = self.cross_attn(query, key_value, key_value)
        output = self.norm(query + self.dropout(attn_output))
        return output
{% endif %}


{% if 'survival_head' in head_types %}
class SurvivalHead(nn.Module):
    """生存分析头"""
    
    def __init__(self, input_dim, num_intervals=10, loss_type='nll'):
        super(SurvivalHead, self).__init__()
        self.num_intervals = num_intervals
        self.loss_type = loss_type
        
        self.fc = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_intervals)
        )
        
    def forward(self, x):
        logits = self.fc(x)
        return logits
{% endif %}


{% if 'segmentation_head' in head_types %}
class SegmentationHead(nn.Module):
    """分割头"""
    
    def __init__(self, encoder_channels, num_classes=2, decoder_type='fcn'):
        super(SegmentationHead, self).__init__()
        self.decoder_type = decoder_type
        
        if decoder_type == 'fcn':
            self.decoder = nn.Sequential(
                nn.Conv2d(encoder_channels[-1], 256, 3, padding=1),
                nn.ReLU(),
                nn.Conv2d(256, num_classes, 1)
            )
        elif decoder_type == 'unet':
            # 简化的U-Net解码器
            self.decoder = UNetDecoder(encoder_channels, num_classes)
    
    def forward(self, features):
        return self.decoder(features)


class UNetDecoder(nn.Module):
    """U-Net解码器"""
    
    def __init__(self, encoder_channels, num_classes):
        super(UNetDecoder, self).__init__()
        # 实现解码器逻辑
        self.upsample = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False)
        self.conv = nn.Conv2d(encoder_channels[-1], num_classes, 1)
    
    def forward(self, x):
        x = self.upsample(x)
        x = self.conv(x)
        return x
{% endif %}


{% if 'titan' in encoder_types %}
class TITANEncoder(nn.Module):
    """TITAN病理基础模型封装"""
    
    def __init__(self, model_path):
        super(TITANEncoder, self).__init__()
        # 加载TITAN模型
        self.model = torch.load(model_path, map_location='cpu')
        self.model.eval()
    
    def forward(self, x):
        with torch.no_grad():
            features = self.model(x)
        return features
{% endif %}
'''

# dataset.py 模板
DATASET_PY_TEMPLATE = '''"""
自动生成的数据集定义
由 Medical AI Workflow 平台生成
"""
import os
import numpy as np
import torch
from torch.utils.data import Dataset
from torchvision import transforms
from PIL import Image
import pandas as pd


class MedicalDataset(Dataset):
    """医学数据集"""
    
    def __init__(self, data_dir, transform=True, split='train'):
        self.data_dir = data_dir
        self.split = split
        self.transform_flag = transform
        
        # 数据加载
        self.samples = self._load_samples()
        
        # 定义变换
        {% if transforms %}
        self.transform = transforms.Compose([
            {% for t in transforms %}
            {% if t.type == 'resize' %}
            transforms.Resize(({{ t.size }}, {{ t.size }})),
            {% elif t.type == 'normalize' %}
            transforms.Normalize(mean={{ t.mean }}, std={{ t.std }}),
            {% elif t.type == 'random_crop' %}
            transforms.RandomCrop({{ t.size }}),
            {% elif t.type == 'horizontal_flip' %}
            transforms.RandomHorizontalFlip(p=0.5),
            {% elif t.type == 'rotation' %}
            transforms.RandomRotation({{ t.rotation }}),
            {% elif t.type == 'color_jitter' %}
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            {% endif %}
            {% endfor %}
        ])
        {% else %}
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        {% endif %}
        
        # 基础变换（始终应用）
        self.base_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor()
        ])
    
    def _load_samples(self):
        """加载样本列表"""
        samples = []
        
        {% if input_type == 'image_folder' %}
        # 从文件夹加载图像
        for class_name in sorted(os.listdir(self.data_dir)):
            class_dir = os.path.join(self.data_dir, class_name)
            if not os.path.isdir(class_dir):
                continue
            
            for img_name in os.listdir(class_dir):
                if img_name.lower().endswith(('.png', '.jpg', '.jpeg', '.tif', '.tiff')):
                    samples.append({
                        'path': os.path.join(class_dir, img_name),
                        'label': class_name
                    })
        
        {% elif input_type == 'clinical_csv' %}
        # 从CSV加载临床数据
        csv_path = os.path.join(self.data_dir, 'data.csv')
        df = pd.read_csv(csv_path)
        
        for _, row in df.iterrows():
            samples.append({
                'features': row[{{ feature_columns }}].values.astype(np.float32),
                'label': row['{{ label_column }}']
            })
        {% endif %}
        
        return samples
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        sample = self.samples[idx]
        
        {% if input_type == 'image_folder' %}
        # 加载图像
        image = Image.open(sample['path']).convert('RGB')
        image = self.base_transform(image)
        
        if self.transform_flag:
            image = self.transform(image)
        
        # 转换标签
        label = int(sample['label'])
        
        return image, torch.tensor(label, dtype=torch.long)
        
        {% elif input_type == 'clinical_csv' %}
        # 返回临床特征
        features = torch.tensor(sample['features'], dtype=torch.float32)
        label = torch.tensor(sample['label'], dtype=torch.long)
        
        return features, label
        {% endif %}


{% if 'pathology_wsi' in input_types %}
class WSI_Dataset(Dataset):
    """病理WSI数据集"""
    
    def __init__(self, wsi_paths, patch_size=224, magnification=20):
        self.wsi_paths = wsi_paths
        self.patch_size = patch_size
        self.magnification = magnification
        
        # 提取所有patches
        self.patches = self._extract_patches()
    
    def _extract_patches(self):
        """从WSI中提取patches"""
        import openslide
        
        patches = []
        for wsi_path in self.wsi_paths:
            slide = openslide.OpenSlide(wsi_path)
            
            # 获取指定倍数的级别
            level = slide.get_best_level_for_downsample(
                slide.level_downsamples[0] * (40 / self.magnification)
            )
            
            # 提取patches
            # 这里简化处理，实际应该使用更复杂的策略
            dims = slide.level_dimensions[level]
            for x in range(0, dims[0], self.patch_size):
                for y in range(0, dims[1], self.patch_size):
                    patch = slide.read_region(
                        (x, y), level, (self.patch_size, self.patch_size)
                    )
                    patches.append(np.array(patch))
            
            slide.close()
        
        return patches
    
    def __len__(self):
        return len(self.patches)
    
    def __getitem__(self, idx):
        patch = self.patches[idx]
        # 应用变换
        return patch
{% endif %}
'''

# config.yaml 模板
CONFIG_YAML_TEMPLATE = '''# 自动生成的配置文件
# 由 Medical AI Workflow 平台生成

# 数据配置
data:
  train_dir: "{{ train_dir }}"
  val_dir: "{{ val_dir }}"
  test_dir: "{{ test_dir }}"
  num_workers: 4
  pin_memory: true

# 模型配置
model:
  {% for encoder in encoders %}
  {{ encoder.id }}:
    type: {{ encoder.type }}
    {% if encoder.pretrained is defined %}
    pretrained: {{ encoder.pretrained }}
    {% endif %}
    {% if encoder.freeze is defined %}
    freeze: {{ encoder.freeze }}
    {% endif %}
  {% endfor %}

# 训练配置
training:
  batch_size: {{ batch_size }}
  epochs: {{ epochs }}
  learning_rate: {{ learning_rate }}
  weight_decay: {{ weight_decay }}
  gradient_clip: {{ gradient_clip }}
  
  # 优化器
  optimizer:
    type: {{ optimizer }}
    
  # 学习率调度
  scheduler:
    type: {{ scheduler }}
    warmup_epochs: {{ warmup_epochs }}
  
  # 损失函数
  loss:
    type: {{ loss_function }}
    weight: {{ loss_weight }}

# 评估配置
evaluation:
  metrics:
    {% if task_type == 'classification' %}
    - accuracy
    - precision
    - recall
    - f1_score
    - auc
    {% elif task_type == 'survival' %}
    - c_index
    - brier_score
    {% elif task_type == 'segmentation' %}
    - dice
    - iou
    {% endif %}

# 日志配置
logging:
  log_dir: "./logs"
  checkpoint_dir: "./checkpoints"
  log_interval: 10
  save_interval: 10
'''

# requirements.txt 模板
REQUIREMENTS_TEMPLATE = '''# 自动生成的依赖文件
# 由 Medical AI Workflow 平台生成

torch>=2.0.0
torchvision>=0.15.0
transformers>=4.30.0
timm>=0.9.0
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.3.0
Pillow>=10.0.0
PyYAML>=6.0
tqdm>=4.65.0
matplotlib>=3.7.0
seaborn>=0.12.0

{% if 'pathology_wsi' in input_types %}
# 病理图像处理
openslide-python>=1.3.0
large-image>=1.20.0
{% endif %}

{% if 'titan' in encoder_types or 'conch' in encoder_types %}
# 病理基础模型
# 请手动安装TITAN/CONCH模型包
# pip install <path-to-titan-package>
{% endif %}

{% if 'stain_normalization' in transforms %}
# 染色归一化
staintools>=2.1.0
spams>=2.6.0
{% endif %}
'''

# README.md 模板
README_TEMPLATE = '''# {{ project_name }}

由 Medical AI Workflow 平台自动生成的项目

## 项目简介

本项目是一个自动生成的医学AI训练 pipeline，包含以下组件：

- **数据加载**: 支持多种医学数据格式
- **模型架构**: 基于表征学习的模块化设计
- **训练流程**: 完整的训练和验证循环

## 项目结构

```
.
├── main.py              # 主训练脚本
├── model.py             # 模型定义
├── dataset.py           # 数据集定义
├── config.yaml          # 配置文件
├── requirements.txt     # 依赖列表
└── README.md           # 本文件
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置数据路径

编辑 `config.yaml` 文件，设置正确的数据路径：

```yaml
data:
  train_dir: "/path/to/train/data"
  val_dir: "/path/to/val/data"
```

### 3. 运行训练

```bash
python main.py
```

## 模型架构

```
Input → {% for encoder in encoders %}{{ encoder.name }} → {% endfor %}{% if fusion %}{{ fusion.name }} → {% endif %}{{ head_name }} → Output
```

### 编码器（特征提取）

{% for encoder in encoders %}
- **{{ encoder.name }}**: {{ encoder.description }}
{% endfor %}

{% if fusion %}
### 特征融合

- **{{ fusion.name }}**: {{ fusion.description }}
{% endif %}

### 下游任务

- **{{ head_name }}**: {{ head_description }}

## 训练配置

- **Batch Size**: {{ batch_size }}
- **Epochs**: {{ epochs }}
- **Learning Rate**: {{ learning_rate }}
- **Optimizer**: {{ optimizer }}
- **Loss Function**: {{ loss_function }}

## 自定义修改

### 修改模型架构

编辑 `model.py` 文件中的 `MedicalAIModel` 类。

### 修改数据加载

编辑 `dataset.py` 文件中的 `MedicalDataset` 类。

### 修改训练参数

编辑 `config.yaml` 文件或在命令行中指定：

```bash
python main.py --config custom_config.yaml
```

## 注意事项

1. 确保数据路径正确配置
2. 如果使用预训练模型，请确保网络连接正常
3. 对于大型模型，建议使用GPU进行训练
4. 检查CUDA是否可用：`torch.cuda.is_available()`

## 引用

如果您使用了本工作流生成的代码，请引用相关论文：

{% for encoder in encoders %}
{% if encoder.paper_url %}
- {{ encoder.name }}: {{ encoder.paper_url }}
{% endif %}
{% endfor %}

## 支持与反馈

如有问题，请访问 Medical AI Workflow 平台获取帮助。
'''

# 节点特定代码模板
NODE_TEMPLATES = {
    'resnet50': '''# ResNet50编码器
from torchvision import models
encoder = models.resnet50(pretrained={{ pretrained }})
{% if freeze %}
for param in encoder.parameters():
    param.requires_grad = False
{% endif %}
encoder.fc = nn.Identity()
''',

    'vit': '''# Vision Transformer编码器
from timm import create_model
encoder = create_model('vit_{{ model_size }}_patch16_224', pretrained={{ pretrained }}, num_classes=0)
{% if freeze %}
for param in encoder.parameters():
    param.requires_grad = False
{% endif %}
''',

    'classifier': '''# 分类头
class ClassifierHead(nn.Module):
    def __init__(self, input_dim, num_classes, hidden_dims={{ hidden_dims }}, dropout={{ dropout }}):
        super().__init__()
        layers = []
        in_dim = input_dim
        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(in_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout)
            ])
            in_dim = hidden_dim
        layers.append(nn.Linear(in_dim, num_classes))
        self.classifier = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.classifier(x)
''',

    'optimizer': '''# 优化器配置
optimizer = torch.optim.{{ type }}(
    model.parameters(),
    lr={{ lr }},
    weight_decay={{ weight_decay }}
)
''',

    'scheduler': '''# 学习率调度器
scheduler = torch.optim.lr_scheduler.{{ type }}(
    optimizer,
    T_max=config['training']['epochs']
)
''',

    'resize': '''# 图像缩放
transforms.Resize(({{ size }}, {{ size }}))''',

    'normalize': '''# 图像归一化
transforms.Normalize(mean={{ mean }}, std={{ std }})''',
}

# 模板集合
TEMPLATES = {
    'main_py': MAIN_PY_TEMPLATE,
    'model_py': MODEL_PY_TEMPLATE,
    'dataset_py': DATASET_PY_TEMPLATE,
    'config_yaml': CONFIG_YAML_TEMPLATE,
    'requirements_txt': REQUIREMENTS_TEMPLATE,
    'readme_md': README_TEMPLATE,
    'nodes': NODE_TEMPLATES
}
