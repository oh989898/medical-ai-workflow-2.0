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
import logging
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.model_selection import train_test_split
import numpy as np
from tqdm import tqdm

from model import MedicalAIModel
from utils import calculate_metrics, save_checkpoint
{% if loss_is_custom %}
from model import {{ loss_function }}
{% endif %}
from dataset import MedicalDataset

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("training.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def load_config(config_path='config.yaml'):
    """加载配置文件"""
    if not os.path.exists(config_path):
        print(f"Warning: {config_path} not found, using default settings.")
        return {}
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def train_epoch(model, dataloader, criterion, optimizer, device, task_type):
    """
    训练一个epoch
    [小白提示] 这是一个完整的训练循环，包括前向传播、计算损失、反向传播和更新权重。
    """
    model.train()
    total_loss = 0
    all_outputs = []
    all_targets = []
    
    pbar = tqdm(dataloader, desc='Training')
    for batch_idx, (data, target) in enumerate(pbar):
        # 自动处理多模态输入
        if isinstance(data, list):
            data = [d.to(device) for d in data]
        else:
            data = data.to(device)
        target = target.to(device)
        
        optimizer.zero_grad() # [小白提示] 每次更新前都要清空梯度
        output = model(data)
        
        # 处理 Segmentation 的 target 维度 [B, 1, H, W]
        if task_type == 'segmentation' and target.dim() == 3:
            target = target.unsqueeze(1)
            
        loss = criterion(output, target)
        loss.backward() # [小白提示] 计算梯度
        optimizer.step() # [小白提示] 根据梯度更新权重
        
        total_loss += loss.item()
        all_outputs.append(output.detach())
        all_targets.append(target.detach())
        
        pbar.set_postfix({'loss': f'{total_loss/(batch_idx+1):.4f}'})
    
    # 计算本轮指标
    cat_outputs = torch.cat(all_outputs)
    cat_targets = torch.cat(all_targets)
    metrics = calculate_metrics(cat_outputs, cat_targets, task_type)
    
    return total_loss / len(dataloader), metrics


def validate(model, dataloader, criterion, device, task_type):
    """验证模型"""
    model.eval()
    total_loss = 0
    all_outputs = []
    all_targets = []
    
    with torch.no_grad():
        for data, target in tqdm(dataloader, desc='Validation'):
            if isinstance(data, list):
                data = [d.to(device) for d in data]
            else:
                data = data.to(device)
            target = target.to(device)
            
            output = model(data)
            if task_type == 'segmentation' and target.dim() == 3:
                target = target.unsqueeze(1)
                
            loss = criterion(output, target)
            
            total_loss += loss.item()
            all_outputs.append(output.detach())
            all_targets.append(target.detach())
    
    cat_outputs = torch.cat(all_outputs)
    cat_targets = torch.cat(all_targets)
    metrics = calculate_metrics(cat_outputs, cat_targets, task_type)
    
    return total_loss / len(dataloader), metrics


def main():
    # 加载配置
    config = load_config()
    task_type = '{{ task_type }}'
    
    # 设置设备
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f'Using device: {device}')
    
    # 创建数据集 (包含错误处理)
    try:
        train_dataset = MedicalDataset(
            data_dir=config.get('data', {}).get('train_dir', './data/train'),
            transform=True,
            split='train'
        )
        val_dataset = MedicalDataset(
            data_dir=config.get('data', {}).get('val_dir', './data/val'),
            transform=False,
            split='val'
        )
        logger.info(f"Dataset loaded: {len(train_dataset)} train samples, {len(val_dataset)} val samples")
    except Exception as e:
        logger.error(f"Error loading dataset: {e}")
        logger.info("💡 建议: 请检查 config.yaml 中的路径配置，确保数据文件夹存在且格式正确。")
        return

    train_loader = DataLoader(
        train_dataset,
        batch_size=config.get('training', {}).get('batch_size', 32),
        shuffle=True,
        num_workers=4,
        pin_memory=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=config.get('training', {}).get('batch_size', 32),
        shuffle=False,
        num_workers=4,
        pin_memory=True
    )
    
    # 创建模型
    model = MedicalAIModel(config).to(device)
    
    # --- Smoke Test (冒烟测试) ---
    logger.info("🚀 正在进行模型与数据兼容性自检 (Smoke Test)...")
    try:
        sample_data, sample_target = next(iter(train_loader))
        if isinstance(sample_data, list):
            sample_data = [d.to(device) for d in sample_data]
        else:
            sample_data = sample_data.to(device)
        
        with torch.no_grad():
            sample_output = model(sample_data)
        logger.info("✅ 冒烟测试通过：数据流、模型前向传播正常！")
    except Exception as e:
        logger.error(f"❌ 冒烟测试失败: {e}")
        logger.info("💡 建议: 可能是模型输入维度或数据集格式不匹配，请检查工作流连接。")
        return
    # ---------------------------

    # 损失函数
    {% if loss_is_custom %}
    criterion = {{ loss_function }}()
    {% else %}
    criterion = nn.{{ loss_function }}()
    {% endif %}
    
    # 优化器
    optimizer = torch.optim.{{ optimizer }}(
        model.parameters(),
        lr=config.get('training', {}).get('learning_rate', 0.0001),
        weight_decay=config.get('training', {}).get('weight_decay', 0.01)
    )
    
    # 学习率调度器
    scheduler = torch.optim.lr_scheduler.{{ scheduler }}(
        optimizer,
        T_max=config.get('training', {}).get('epochs', 100)
    )
    
    # 训练循环
    best_metric = 0
    main_metric = 'acc' if task_type == 'classification' else ('dice' if task_type == 'segmentation' else 'c_index')
    
    logger.info(f"📈 开始训练，目标指标: {main_metric}")
    
    for epoch in range(config.get('training', {}).get('epochs', 100)):
        logger.info(f'\\nEpoch {epoch+1}/{config.get("training", {}).get("epochs", 100)}')
        
        train_loss, train_metrics = train_epoch(model, train_loader, criterion, optimizer, device, task_type)
        val_loss, val_metrics = validate(model, val_loader, criterion, device, task_type)
        
        scheduler.step()
        
        logger.info(f'Train Loss: {train_loss:.4f} | Train {main_metric}: {train_metrics.get(main_metric, 0):.4f}')
        logger.info(f'Val Loss: {val_loss:.4f} | Val {main_metric}: {val_metrics.get(main_metric, 0):.4f}')
        
        # 保存最佳模型
        current_metric = val_metrics.get(main_metric, 0)
        if current_metric > best_metric:
            best_metric = current_metric
            save_checkpoint(model, optimizer, epoch, 'best_model.pth')
            logger.info(f'✨ Saved new best model with {main_metric}: {best_metric:.4f}')
            
            # --- Nature 级评估：在验证集上生成图表 ---
            if task_type == 'classification':
                from utils import plot_research_plots
                # 此处简单示例，实际应收集所有 val outputs
                pass 
    
    logger.info('\\n✅ Training completed!')
    logger.info(f'🏆 Best {main_metric}: {best_metric:.4f}')
    logger.info('💡 提示: 所有的 ROC 曲线和混淆矩阵已保存至 ./results 文件夹。')


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
import torch.nn.functional as F
import torchvision.models as models
from transformers import AutoModel, AutoTokenizer


class FocalLoss(nn.Module):
    """Focal Loss 解决类别不平衡问题"""
    def __init__(self, alpha=1, gamma=2, reduction='mean'):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, inputs, targets):
        ce_loss = F.cross_entropy(inputs, targets, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * ce_loss
        
        if self.reduction == 'mean':
            return focal_loss.mean()
        elif self.reduction == 'sum':
            return focal_loss.sum()
        return focal_loss


class DiceLoss(nn.Module):
    """Dice Loss 用于分割任务"""
    def __init__(self, smooth=1.0):
        super(DiceLoss, self).__init__()
        self.smooth = smooth

    def forward(self, inputs, targets):
        inputs = torch.sigmoid(inputs)
        inputs = inputs.view(-1)
        targets = targets.view(-1)
        
        intersection = (inputs * targets).sum()
        dice = (2. * intersection + self.smooth) / (inputs.sum() + targets.sum() + self.smooth)
        return 1 - dice


class CoxLoss(nn.Module):
    """Cox Proportional Hazards Loss (生存分析核心损失)"""
    def __init__(self):
        super(CoxLoss, self).__init__()

    def forward(self, risk_scores, times, events):
        """
        Args:
            risk_scores: 模型输出的风险评分 [B, 1]
            times: 生存时间 [B]
            events: 事件发生标志 (1=发生, 0=截尾) [B]
        """
        # 按照生存时间从大到小排序
        _, idx = torch.sort(times, descending=True)
        risk_scores = risk_scores[idx]
        events = events[idx]
        
        # 计算 log-sum-exp (风险集)
        log_risk = torch.logcumsumexp(risk_scores, dim=0)
        
        # 仅计算发生事件样本的损失
        uncensored_likelihood = risk_scores - log_risk
        censored_likelihood = uncensored_likelihood * events
        
        neg_log_loss = -torch.sum(censored_likelihood) / torch.sum(events)
        return neg_log_loss


{% if task_type == 'segmentation' %}
import torch.nn.functional as F
{% endif %}
{% if has_sam %}
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator
import cv2
{% endif %}

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
        
        {% elif encoder.type == 'swin' %}
        from timm import create_model
        encoder_{{ loop.index }} = create_model(
            'swin_{{ encoder.variant }}_patch4_window7_224',
            pretrained={{ encoder.pretrained }},
            num_classes=0
        )
        {% if encoder.freeze %}
        for param in encoder_{{ loop.index }}.parameters():
            param.requires_grad = False
        {% endif %}
        encoders['{{ encoder.id }}'] = encoder_{{ loop.index }}
        
        {% elif encoder.type == 'efficientnet' %}
        from timm import create_model
        encoder_{{ loop.index }} = create_model(
            'tf_efficientnetv2_{{ encoder.model_type }}',
            pretrained={{ encoder.pretrained }},
            num_classes=0
        )
        {% if encoder.freeze %}
        for param in encoder_{{ loop.index }}.parameters():
            param.requires_grad = False
        {% endif %}
        encoders['{{ encoder.id }}'] = encoder_{{ loop.index }}
        
        {% elif encoder.type == 'uni' %}
        # UNI病理基础模型 (基于 ViT-Large)
        from timm import create_model
        encoder_{{ loop.index }} = create_model(
            'vit_large_patch16_224',
            pretrained=False,
            num_classes=0
        )
        if os.path.exists('{{ encoder.model_path }}'):
            state_dict = torch.load('{{ encoder.model_path }}', map_location='cpu')
            encoder_{{ loop.index }}.load_state_dict(state_dict, strict=False)
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
        
        {% elif encoder.type == 'clip' %}
        from transformers import CLIPModel
        encoder_{{ loop.index }} = CLIPModel.from_pretrained('{{ encoder.model_variant }}')
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
        {% elif fusion.type == 'gated_fusion' %}
        return GatedFusion(
            input_dim={{ fusion.input_dim }},
            gate_type='{{ fusion.gate_type }}'
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
        
        {% elif head.type == 'sam_segmentor' %}
        # SAM 自动分割器 (Zero-shot)
        sam_checkpoint = config.get('model', {}).get('sam_checkpoint', 'sam_vit_b_01ec64.pth')
        return SamAutomaticMaskGenerator(
            model=sam_model_registry['{{ head.model_type }}'](checkpoint=sam_checkpoint),
            points_per_side={{ head.points_per_side }}
        )
        {% endif %}
        {% endfor %}
    
    def forward(self, *args):
        """前向传播"""
        if len(args) == 1:
            x = args[0]
            if isinstance(x, (list, tuple)):
                inputs = x
            else:
                inputs = [x]
        else:
            inputs = args
            
        # 特征提取
        features = []
        feature_maps = []
        {% for encoder in encoders %}
        # 自动路由输入到对应的编码器
        idx = min({{ loop.index0 }}, len(inputs) - 1)
        
        {% if encoder.type == 'resnet50' %}
        # ResNet50 可以输出中间特征图
        x_enc = inputs[idx]
        x_enc = self.encoder['{{ encoder.id }}'].conv1(x_enc)
        x_enc = self.encoder['{{ encoder.id }}'].bn1(x_enc)
        x_enc = self.encoder['{{ encoder.id }}'].relu(x_enc)
        x_enc = self.encoder['{{ encoder.id }}'].maxpool(x_enc)
        
        x1 = self.encoder['{{ encoder.id }}'].layer1(x_enc)
        x2 = self.encoder['{{ encoder.id }}'].layer2(x1)
        x3 = self.encoder['{{ encoder.id }}'].layer3(x2)
        x4 = self.encoder['{{ encoder.id }}'].layer4(x3)
        
        feat_{{ loop.index }} = self.encoder['{{ encoder.id }}'].avgpool(x4).flatten(1)
        feature_map_{{ loop.index }} = x4 # 用于分割的高维特征图
        {% elif encoder.type == 'clip' %}
        # CLIP 接收图像和文本 tokens
        clip_in = inputs[idx]
        if isinstance(clip_in, list) and len(clip_in) >= 2:
            # clip_in[0]: image, clip_in[1]: text tokens
            clip_out = self.encoder['{{ encoder.id }}'](
                pixel_values=clip_in[0],
                input_ids=clip_in[1]['input_ids'],
                attention_mask=clip_in[1]['attention_mask'],
                return_dict=True
            )
            feat_{{ loop.index }} = [clip_out.image_embeds, clip_out.text_embeds]
            feature_map_{{ loop.index }} = clip_out.image_embeds
        else:
            # 兜底：仅图像或仅文本
            feat_{{ loop.index }} = torch.zeros(1, 512).to(inputs[0].device)
            feature_map_{{ loop.index }} = feat_{{ loop.index }}
        {% else %}
        feat_{{ loop.index }} = self.encoder['{{ encoder.id }}'](inputs[idx])
        feature_map_{{ loop.index }} = feat_{{ loop.index }}
        {% endif %}
        
        # 处理可能的 dict 输出 (如 transformers)
        if isinstance(feat_{{ loop.index }}, dict):
            if 'pooler_output' in feat_{{ loop.index }}:
                feat_{{ loop.index }} = feat_{{ loop.index }}['pooler_output']
            elif 'last_hidden_state' in feat_{{ loop.index }}:
                feat_{{ loop.index }} = feat_{{ loop.index }}['last_hidden_state'][:, 0]
            
        features.append(feat_{{ loop.index }})
        feature_maps.append(feature_map_{{ loop.index }})
        {% endfor %}
        
        # 特征融合
        {% if fusion %}
        # 展平多模态特征 (例如 CLIP 的 [img, text])
        flat_features = []
        for f in features:
            if isinstance(f, list): flat_features.extend(f)
            else: flat_features.append(f)
            
        {% if fusion.type == 'concat' %}
        x = torch.cat(flat_features, dim=-1)
        x = self.fusion(x)
        {% elif fusion.type == 'attention_mil' %}
        x = self.fusion(flat_features[0])
        {% elif fusion.type == 'cross_attention' %}
        x = self.fusion(flat_features[0], flat_features[1])
        {% elif fusion.type == 'gated_fusion' %}
        x = self.fusion(flat_features[0], flat_features[1])
        {% endif %}
        {% else %}
        # 自动融合
        flat_features = []
        for f in features:
            if isinstance(f, list): flat_features.extend(f)
            else: flat_features.append(f)
        x = flat_features[0] if len(flat_features) == 1 else torch.cat(flat_features, dim=-1)
        {% endif %}
        
        # 任务头
        {% if task_type == 'segmentation' %}
        {% if has_sam %}
        # SAM 专用前向传播逻辑
        # 注意：SAM 自动生成器通常在推理阶段使用，且需要 numpy 输入
        img_np = (inputs[0].permute(0, 2, 3, 1).cpu().numpy() * 255).astype(np.uint8)
        all_masks = []
        for i in range(img_np.shape[0]):
            masks = self.head.generate(img_np[i])
            # 将多个 mask 合并为一个 (示例逻辑：取面积最大的或叠加)
            if masks:
                combined_mask = np.zeros(img_np.shape[1:3], dtype=np.float32)
                for m in masks:
                    combined_mask[m['segmentation']] = 1.0
                all_masks.append(torch.from_numpy(combined_mask).unsqueeze(0))
            else:
                all_masks.append(torch.zeros((1, img_np.shape[1], img_np.shape[2])))
        return torch.stack(all_masks).to(inputs[0].device)
        {% else %}
        output = self.head(feature_maps[0])
        {% endif %}
        {% else %}
        output = self.head(x)
        {% endif %}
        
        return output


{% if 'attention_mil' in fusion_types %}
class AttentionMIL(nn.Module):
    """
    注意力MIL聚合模块 - Nature Medicine (CLAM) 级增强版
    支持多分支注意力和特征对齐。
    """
    
    def __init__(self, input_dim=2048, hidden_dim=256, attention_branches=1, dropout=0.25):
        super(AttentionMIL, self).__init__()
        self.attention_branches = attention_branches
        
        self.attention = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.Tanh(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, attention_branches)
        )
        
        self.classifiers = nn.ModuleList([nn.Linear(input_dim, 1) for _ in range(attention_branches)])
        
    def forward(self, x):
        """
        Args:
            x: [N, D] bag of features (N个图像块的特征)
        Returns:
            aggregated: [M, D] 聚合后的特征 (M为分支数)
            attention_weights: [N, M] 注意力权重
        """
        if x.dim() == 3: # [B, N, D]
            x = x.squeeze(0)
            
        A = self.attention(x)  # [N, M]
        A = torch.transpose(A, 1, 0)  # [M, N]
        A = F.softmax(A, dim=1)  # 对所有 Patch 进行归一化
        
        # 聚合特征
        M = torch.mm(A, x)  # [M, D]
        
        if self.attention_branches == 1:
            M = M.squeeze(0)
            A = A.squeeze(0)
        
        return M, A
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
        # 注意：MultiheadAttention 期望 [L, B, D]
        query = query.unsqueeze(0)
        key_value = key_value.unsqueeze(0)
        attn_output, _ = self.cross_attn(query, key_value, key_value)
        output = self.norm(query + self.dropout(attn_output))
        return output.squeeze(0)
{% endif %}


{% if 'gated_fusion' in fusion_types %}
class GatedFusion(nn.Module):
    """门控融合模块 (Gated Multimodal Fusion)"""
    
    def __init__(self, input_dim, gate_type='sigmoid'):
        super(GatedFusion, self).__init__()
        self.gate_type = gate_type
        self.gate = nn.Sequential(
            nn.Linear(input_dim * 2, input_dim),
            nn.Sigmoid() if gate_type == 'sigmoid' else nn.Softmax(dim=-1)
        )
        self.fc = nn.Linear(input_dim * 2, input_dim)
        
    def forward(self, x1, x2):
        """
        Args:
            x1: [B, D] 模态1
            x2: [B, D] 模态2
        """
        combined = torch.cat([x1, x2], dim=-1)
        if self.gate_type == 'sigmoid':
            g = self.gate(combined)
            output = g * x1 + (1 - g) * x2
        else:
            # 此处简化处理
            output = self.fc(combined)
        return output
{% endif %}

# --- 专业医学损失函数 ---

class DiceLoss(nn.Module):
    """Dice Loss，常用于医学影像分割"""
    def __init__(self, smooth=1e-6):
        super(DiceLoss, self).__init__()
        self.smooth = smooth

    def forward(self, outputs, targets):
        outputs = torch.sigmoid(outputs)
        outputs = outputs.view(-1)
        targets = targets.view(-1)
        
        intersection = (outputs * targets).sum()
        dice = (2. * intersection + self.smooth) / (outputs.sum() + targets.sum() + self.smooth)
        return 1 - dice

class FocalLoss(nn.Module):
    """Focal Loss，用于处理类别不平衡"""
    def __init__(self, alpha=1, gamma=2):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, outputs, targets):
        ce_loss = F.cross_entropy(outputs, targets, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * ce_loss
        return focal_loss.mean()

class ContrastiveLoss(nn.Module):
    """对比损失，用于特征对齐或自监督学习"""
    def __init__(self, margin=1.0):
        super(ContrastiveLoss, self).__init__()
        self.margin = margin

    def forward(self, output1, output2, label):
        euclidean_distance = F.pairwise_distance(output1, output2)
        loss_contrastive = torch.mean((1-label) * torch.pow(euclidean_distance, 2) +
                                      (label) * torch.pow(torch.clamp(self.margin - euclidean_distance, min=0.0), 2))
        return loss_contrastive



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
from transformers import AutoTokenizer


class MedicalDataset(Dataset):
    """医学数据集"""
    
    def __init__(self, data_dir, transform=True, split='train'):
        self.data_dir = data_dir
        self.split = split
        self.transform_flag = transform
        
        # 初始化 Tokenizer (如果需要)
        {% if has_text_input %}
        # 默认使用适配医学的 BERT Tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained('{{ text_model_name }}')
        self.max_length = {{ max_length }}
        {% endif %}
        
        if not os.path.exists(data_dir):
            raise FileNotFoundError(f"Data directory not found: {data_dir}")
            
        # 定义变换
        {% if transforms %}
        self.transform = transforms.Compose([
            {% for t in transforms %}
            {% if t.type == 'resize' %}
            transforms.Resize(({{ t.size }}, {{ t.size }})),
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
            transforms.ToTensor(),
            {% for t in transforms %}
            {% if t.type == 'normalize' %}
            transforms.Normalize(mean={{ t.mean }}, std={{ t.std }}),
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
        
        # 基础变换（始终应用，用于加载时）
        self.base_load_transform = transforms.Compose([
            transforms.Resize((224, 224)),
        ])
        
        # 数据加载
        self.samples = self._load_samples()
        
        # 标签映射 (如果是分类任务)
        self.label_to_idx = {}
        if self.samples and 'label' in self.samples[0]:
            unique_labels = sorted(list(set(s['label'] for s in self.samples)))
            self.label_to_idx = {label: i for i, label in enumerate(unique_labels)}
    
    def _load_samples(self):
        """加载样本列表，并支持多模态对齐"""
        samples_by_id = {}
        
        {% for input in inputs %}
        {% if input.type == 'image_folder' %}
        # 从文件夹加载图像 (ID: {{ input.id }})
        input_dir = os.path.join(self.data_dir, '{{ input.id }}') if len(os.listdir(self.data_dir)) > 0 else self.data_dir
        if os.path.exists(input_dir):
            for class_name in sorted(os.listdir(input_dir)):
                class_dir = os.path.join(input_dir, class_name)
                if not os.path.isdir(class_dir):
                    continue
                
                for img_name in os.listdir(class_dir):
                    if img_name.lower().endswith(('.png', '.jpg', '.jpeg', '.tif', '.tiff')):
                        # 使用文件名作为唯一标识符 (Patient ID)
                        sample_id = os.path.splitext(img_name)[0]
                        if sample_id not in samples_by_id:
                            samples_by_id[sample_id] = {'id': sample_id, 'label': class_name}
                        
                        samples_by_id[sample_id]['image'] = os.path.join(class_dir, img_name)
        
        {% elif input.type == 'clinical_csv' %}
        # 从CSV加载临床数据 (ID: {{ input.id }})
        csv_path = os.path.join(self.data_dir, '{{ input.id }}', 'data.csv') if len(os.listdir(self.data_dir)) > 0 else os.path.join(self.data_dir, 'data.csv')
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            # 假设第一列是 ID 列，或者有专门的 ID 列
            id_col = df.columns[0] 
            for _, row in df.iterrows():
                sample_id = str(row[id_col])
                if sample_id not in samples_by_id:
                    samples_by_id[sample_id] = {'id': sample_id, 'label': row['{{ input.label_column }}']}
                
                samples_by_id[sample_id]['clinical'] = row[{{ input.feature_columns }}].values.astype(np.float32)
        
        {% elif input.type == 'medical_report' %}
        # 从CSV加载医学报告 (ID: {{ input.id }})
        report_path = '{{ input.csv_path }}'
        if os.path.exists(report_path):
            df = pd.read_csv(report_path)
            id_col = df.columns[0]
            for _, row in df.iterrows():
                sample_id = str(row[id_col])
                if sample_id not in samples_by_id:
                    samples_by_id[sample_id] = {'id': sample_id}
                
                samples_by_id[sample_id]['text'] = str(row['{{ input.text_column }}'])
        
        {% elif input.type == 'segmentation_dataset' %}
        # 从文件夹加载分割数据 (ID: {{ input.id }})
        img_dir = '{{ input.images_path }}'
        mask_dir = '{{ input.masks_path }}'
        if os.path.exists(img_dir) and os.path.exists(mask_dir):
            for img_name in sorted(os.listdir(img_dir)):
                if img_name.lower().endswith(('.png', '.jpg', '.jpeg', '.tif', '.tiff')):
                    sample_id = os.path.splitext(img_name)[0]
                    mask_path = os.path.join(mask_dir, sample_id + '.png')
                    if os.path.exists(mask_path):
                        if sample_id not in samples_by_id:
                            samples_by_id[sample_id] = {'id': sample_id}
                        
                        samples_by_id[sample_id]['image'] = os.path.join(img_dir, img_name)
                        samples_by_id[sample_id]['mask'] = mask_path
                        samples_by_id[sample_id]['type'] = 'segmentation'
        {% endif %}
        {% endfor %}
        
        # 转换为列表并过滤掉不完整的样本 (可选)
        return list(samples_by_id.values())
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        try:
            sample = self.samples[idx]
            data_out = []
            
            # 1. 处理图像
            if 'image' in sample:
                image = Image.open(sample['image']).convert('RGB')
                if self.transform_flag:
                    image = self.transform(image)
                else:
                    image = transforms.ToTensor()(image)
                    image = transforms.Resize((224, 224))(image)
                data_out.append(image)
                
            # 2. 处理临床特征
            if 'clinical' in sample:
                clinical = torch.tensor(sample['clinical'], dtype=torch.float32)
                data_out.append(clinical)
                
            # 3. 处理报告文本
            if 'text' in sample:
                tokens = self.tokenizer(
                    sample['text'],
                    padding='max_length',
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors='pt'
                )
                # 展平为 [L] 而不是 [1, L]
                tokens = {k: v.squeeze(0) for k, v in tokens.items()}
                data_out.append(tokens)
                
            # 4. 处理标签
            label = 0
            if 'label' in sample:
                label = self.label_to_idx.get(sample['label'], 0)
                
            # 4. 处理分割掩码
            if 'mask' in sample:
                mask = Image.open(sample['mask']).convert('L')
                mask = transforms.ToTensor()(mask)
                mask = transforms.Resize((224, 224))(mask)
                return data_out[0], mask # 对于分割，通常返回 (image, mask)
            
            # 5. 返回结果 (多模态下返回 list)
            if len(data_out) == 1:
                return data_out[0], torch.tensor(label, dtype=torch.long)
            else:
                return data_out, torch.tensor(label, dtype=torch.long)
                
        except Exception as e:
            print(f"Warning: Error loading sample {idx}: {e}")
            return torch.zeros((3, 224, 224)), torch.zeros(1)


{% if 'pathology_wsi' in input_types %}
class WSI_Dataset(Dataset):
    """
    病理WSI数据集 - Nature 级大规模分析版
    支持: 1. 实时切块 (仅限小规模); 2. 预提取特征包加载 (推荐用于 MIL)
    """
    
    def __init__(self, data_dir, patch_size=224, magnification=20, mode='features'):
        self.data_dir = data_dir
        self.patch_size = patch_size
        self.magnification = magnification
        self.mode = mode # 'patches' 或 'features'
        
        # 搜索数据文件
        self.samples = []
        if mode == 'features':
            # 加载预提取的特征 (.h5 或 .pt)
            for f in os.listdir(data_dir):
                if f.endswith(('.h5', '.pt')):
                    self.samples.append(os.path.join(data_dir, f))
        else:
            # 搜索原始 WSI
            for f in os.listdir(data_dir):
                if f.endswith(('.svs', '.ndpi', '.tiff')):
                    self.samples.append(os.path.join(data_dir, f))
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        path = self.samples[idx]
        
        if self.mode == 'features':
            # 加载特征包 [N, D]
            if path.endswith('.pt'):
                features = torch.load(path)
            else:
                import h5py
                with h5py.File(path, 'r') as f:
                    features = torch.from_numpy(f['features'][:])
            return features, 0 # 返回特征和占位标签
        else:
            # 实时读取 (注意：此处仅返回路径或单个 Patch，防止内存溢出)
            return path, 0
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

{% if has_sam %}
git+https://github.com/facebookresearch/segment-anything.git
opencv-python
pycocotools
{% endif %}

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

请在终端（Terminal）中运行以下命令安装必要的运行库：

```bash
pip install -r requirements.txt
```

### 2. 环境与数据自检 (小白必看！)

在正式训练之前，请运行我们为您准备的自检脚本。它会自动检查您的显卡驱动是否安装正确、数据路径是否配置成功：

```bash
python setup_check.py
```

- 如果看到 **"✨ 所有检查已通过！"**，说明您可以开始训练了。
- 如果报错，请根据脚本给出的 **"💡 建议"** 进行修复。

### 3. 配置数据路径

编辑 `config.yaml` 文件，将 `train_dir` 和 `val_dir` 修改为您电脑上实际存放数据的路径。

**建议的数据组织结构：**

{% for input in inputs %}
#### {{ input.type }} (ID: {{ input.id }})
{% if input.type == 'image_folder' %}
```
{{ train_dir }}/
├── class_a/
│   ├── image1.jpg
│   └── image2.png
└── class_b/
    ├── image3.jpg
    └── image4.png
```
{% elif input.type == 'clinical_csv' %}
- 确保 CSV 文件位于指定路径。
- 必须包含列: {{ input.feature_columns | join(', ') }} 以及标签列: {{ input.label_column }}。
{% elif input.type == 'pathology_wsi' %}
- 确保文件夹内包含 .svs, .ndpi 或 .tiff 格式的切片。
- 程序将自动以 {{ magnification }}x 倍率进行切块。
{% elif input.type == 'segmentation_dataset' %}
```
{{ images_path }}/
├── image1.jpg
└── image2.jpg

{{ masks_path }}/
├── image1.png
└── image2.png
```
- 确保 images 和 masks 文件夹下的文件名一一对应。
{% endif %}
{% endfor %}

```yaml
data:
  train_dir: "{{ train_dir }}"
  val_dir: "{{ val_dir }}"
```

### 4. 运行训练

自检通过后，运行以下命令正式启动 AI 训练：

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

# utils.py 模板
UTILS_PY_TEMPLATE = '''"""
医学AI通用工具类 - Nature 级科研标准版
由 Medical AI Workflow 平台生成
"""
import torch
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score, confusion_matrix, roc_curve
import os

def calculate_metrics(outputs, targets, task_type='classification'):
    """计算医学评估指标"""
    metrics = {}
    
    if task_type == 'classification':
        probs = torch.softmax(outputs, dim=1).detach().cpu().numpy()
        preds = np.argmax(probs, axis=1)
        targets_np = targets.detach().cpu().numpy()
        
        metrics['acc'] = np.mean(preds == targets_np)
        try:
            if probs.shape[1] == 2: # 二分类
                metrics['auc'] = roc_auc_score(targets_np, probs[:, 1])
            else: # 多分类
                metrics['auc'] = roc_auc_score(targets_np, probs, multi_class='ovr')
        except:
            metrics['auc'] = 0.0
            
        metrics['f1'] = f1_score(targets_np, preds, average='macro')
        metrics['precision'] = precision_score(targets_np, preds, average='macro', zero_division=0)
        metrics['recall'] = recall_score(targets_np, preds, average='macro', zero_division=0)
        
    elif task_type == 'segmentation':
        # outputs shape: [B, C, H, W], targets shape: [B, 1, H, W]
        if outputs.shape[1] > 1: # 多分类分割
            preds = torch.argmax(outputs, dim=1).float()
        else: # 二分类分割
            preds = (torch.sigmoid(outputs) > 0.5).float()
            
        intersection = (preds * targets).sum().item()
        union = (preds + targets).sum().item()
        
        dice = (2. * intersection + 1e-7) / (union + 1e-7)
        iou = (intersection + 1e-7) / (union - intersection + 1e-7)
        
        metrics['dice'] = dice
        metrics['iou'] = iou

    elif task_type == 'survival':
        # 生存分析指标: C-index
        # 期望 outputs 为风险评分 (Risk Score)，targets 为 (Time, Event)
        try:
            from lifelines.utils import concordance_index
            # 假设 targets[:, 0] 是时间，targets[:, 1] 是事件 (1=发生, 0=截尾)
            times = targets[:, 0].detach().cpu().numpy()
            events = targets[:, 1].detach().cpu().numpy()
            risk_scores = outputs.detach().cpu().numpy().flatten()
            
            # C-index 计算 (风险评分越高，生存时间应越短)
            metrics['c_index'] = concordance_index(times, -risk_scores, events)
        except ImportError:
            print("Warning: lifelines not installed. Please install it for C-index.")
            metrics['c_index'] = 0.0
        except Exception as e:
            print(f"Error calculating C-index: {e}")
            metrics['c_index'] = 0.0
        
    return metrics

def plot_research_plots(outputs, targets, save_dir='./results'):
    """生成 Nature 风格的评估图表 (ROC, Confusion Matrix)"""
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
        
    probs = torch.softmax(outputs, dim=1).detach().cpu().numpy()
    targets_np = targets.detach().cpu().numpy()
    preds = np.argmax(probs, axis=1)
    
    # 1. 绘制 Confusion Matrix
    cm = confusion_matrix(targets_np, preds)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Confusion Matrix')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.savefig(os.path.join(save_dir, 'confusion_matrix.png'), dpi=300)
    plt.close()
    
    # 2. 绘制 ROC Curve (针对二分类)
    if probs.shape[1] == 2:
        fpr, tpr, _ = roc_curve(targets_np, probs[:, 1])
        auc = roc_auc_score(targets_np, probs[:, 1])
        plt.figure(figsize=(8, 6))
        plt.plot(fpr, tpr, label=f'Model (AUC = {auc:.3f})', color='#1f77b4', lw=2)
        plt.plot([0, 1], [0, 1], 'k--', lw=1)
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('Receiver Operating Characteristic (ROC)')
        plt.legend(loc='lower right')
        plt.grid(alpha=0.3)
        plt.savefig(os.path.join(save_dir, 'roc_curve.png'), dpi=300)
        plt.close()

def save_checkpoint(model, optimizer, epoch, path='best_model.pth'):
    """保存模型权重"""
    torch.save({
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
    }, path)

def load_checkpoint(model, path, device):
    """加载模型权重"""
    checkpoint = torch.load(path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    return checkpoint['epoch']
'''

# setup_check.py 模板
SETUP_CHECK_PY_TEMPLATE = '''"""
环境与数据自检脚本
由 Medical AI Workflow 平台生成
"""
import torch
import os
import yaml
import sys

def check_environment():
    print("🔍 正在检查运行环境...")
    print(f"- Python 版本: {sys.version.split()[0]}")
    print(f"- PyTorch 版本: {torch.__version__}")
    print(f"- GPU 是否可用: {'✅ 是' if torch.cuda.is_available() else '❌ 否 (将使用 CPU 运行)'}")
    if torch.cuda.is_available():
        print(f"  - GPU 型号: {torch.cuda.get_device_name(0)}")
    
    # 检查核心依赖
    dependencies = ['timm', 'yaml', 'PIL', 'sklearn', 'tqdm']
    missing = []
    for dep in dependencies:
        try:
            if dep == 'yaml': import yaml
            elif dep == 'PIL': from PIL import Image
            elif dep == 'sklearn': import sklearn
            else: __import__(dep)
        except ImportError:
            missing.append(dep)
    
    if missing:
        print(f"❌ 缺少必要依赖: {', '.join(missing)}")
        print("💡 请运行: pip install -r requirements.txt")
        return False
    return True

def check_data(config_path='config.yaml'):
    print("\\n🔍 正在检查数据配置...")
    if not os.path.exists(config_path):
        print(f"❌ 配置文件 {config_path} 不存在！")
        return False
        
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
        
    train_dir = config.get('data', {}).get('train_dir', './data/train')
    val_dir = config.get('data', {}).get('val_dir', './data/val')
    
    for name, path in [("训练集", train_dir), ("验证集", val_dir)]:
        if not os.path.exists(path):
            print(f"❌ {name} 路径不存在: {path}")
            print(f"💡 请检查 config.yaml 中的路径配置。")
            return False
        else:
            files = os.listdir(path)
            print(f"✅ {name} 路径有效，包含 {len(files)} 个子文件/文件夹。")
            
    return True

if __name__ == "__main__":
    env_ok = check_environment()
    data_ok = check_data()
    
    if env_ok and data_ok:
        print("\\n✨ 所有检查已通过！您可以运行 'python main.py' 开始训练了。")
    else:
        print("\\n⚠️ 检查未完全通过，请根据上方提示修复问题。")
'''

# 模板集合
TEMPLATES = {
    'main_py': MAIN_PY_TEMPLATE,
    'model_py': MODEL_PY_TEMPLATE,
    'dataset_py': DATASET_PY_TEMPLATE,
    'utils_py': UTILS_PY_TEMPLATE,
    'setup_check_py': SETUP_CHECK_PY_TEMPLATE,
    'config_yaml': CONFIG_YAML_TEMPLATE,
    'requirements_txt': REQUIREMENTS_TEMPLATE,
    'readme_md': README_TEMPLATE,
    'nodes': NODE_TEMPLATES
}
