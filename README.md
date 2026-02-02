---
title: Medical Ai Workflow 2.0
emoji: 🔬
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# Medical AI Workflow - 医学AI可视化工作流平台

面向医学科研人员的"低代码/无代码"可视化AI工作流搭建平台。

## 核心特性

- **可视化工作流编排**：拖拽式节点编辑器，支持无限画布
- **表征学习范式**：严格遵循 Input → Encoder → Latent Space → Head 架构
- **医学AI专用**：集成病理WSI、MIL、生存分析等医学专用组件
- **代码自动生成**：一键导出完整的PyTorch训练代码
- **类型安全**：智能类型检查，防止错误连接

## 技术栈

### 前端
- React 18 + TypeScript
- React Flow（节点编辑器）
- Zustand（状态管理）
- Tailwind CSS（样式）
- React DnD（拖拽）

### 后端
- FastAPI（Web框架）
- NetworkX（拓扑排序）
- Jinja2（代码模板）
- Pydantic（数据验证）

## 项目结构

```
medical-ai-workflow/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── components/   # UI组件
│   │   ├── nodes/        # 节点定义和组件
│   │   ├── stores/       # 状态管理
│   │   ├── types/        # TypeScript类型
│   │   └── App.tsx       # 主应用
│   ├── package.json
│   └── vite.config.ts
├── backend/               # 后端项目
│   ├── app/
│   │   ├── main.py       # FastAPI入口
│   │   ├── models.py     # 数据模型
│   │   ├── topology.py   # 拓扑排序引擎
│   │   ├── code_generator.py  # 代码生成引擎
│   │   └── templates.py  # 代码模板
│   └── requirements.txt
└── start.sh              # 启动脚本
```

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd medical-ai-workflow
```

### 2. 启动服务

**同时启动前后端：**
```bash
./start.sh all
```

**只启动前端：**
```bash
./start.sh frontend
```

**只启动后端：**
```bash
./start.sh backend
```

### 3. 访问应用

- 前端界面：http://localhost:3000
- 后端API：http://localhost:8000
- API文档：http://localhost:8000/docs

## 使用指南

### 创建第一个工作流

1. **添加输入节点**：从左侧节点库拖拽 "Image Folder" 到画布
2. **添加预处理**：拖拽 "Resize" 和 "Normalize" 节点
3. **添加编码器**：拖拽 "ResNet50" 或 "TITAN" 节点
4. **添加任务头**：拖拽 "Classifier" 节点
5. **连接节点**：点击并拖动端口进行连接
6. **配置参数**：点击节点，在右侧面板设置参数
7. **生成代码**：点击顶部工具栏的 "生成代码" 按钮

### 节点类型

| 分类 | 节点示例 | 说明 |
|-----|---------|-----|
| 输入 | Image Folder, Pathology WSI, Clinical CSV | 数据源定义 |
| 预处理 | Resize, Normalize, Stain Normalization | 数据增强与标准化 |
| 编码器 | ResNet50, ViT, TITAN, CONCH | 特征提取（Z-Space） |
| 融合 | Concat, Cross Attention, Attention MIL | 多模态特征融合 |
| 下游任务 | Classifier, Survival Head, Segmentation Head | 任务特定输出 |
| 训练配置 | Optimizer, Scheduler, Loss Function | 超参数配置 |

### 生成的代码结构

```python
project/
├── main.py              # 训练脚本
├── model.py             # 模型定义
├── dataset.py           # 数据加载
├── config.yaml          # 配置文件
├── requirements.txt     # 依赖列表
└── README.md           # 项目说明
```

## 核心概念

### 表征学习范式

```
Input → Encoder (Backbone) → Latent Space (Z-Space) → Projector/Head → Output
```

- **Input**：医学图像、临床数据、基因序列
- **Encoder**：ResNet、ViT、TITAN等特征提取器
- **Latent Space**：高维特征表示
- **Head**：分类、分割、生存分析等任务头

### 类型系统

节点端口具有类型约束，确保数据正确流动：

- `image`: 图像张量 [B, C, H, W]
- `embedding`: 特征向量 [B, D] 或 [N, D]
- `text`: 文本数据
- `label`: 标签数据
- `attention`: 注意力权重

## API文档

### 代码生成

```http
POST /api/generate-code
Content-Type: application/json

{
  "workflow": {
    "id": "workflow_123",
    "name": "Cancer Classification",
    "nodes": [...],
    "connections": [...]
  }
}
```

### 工作流验证

```http
POST /api/validate-workflow
Content-Type: application/json

{
  "id": "workflow_123",
  "nodes": [...],
  "connections": [...]
}
```

## 开发计划

- [x] 基础画布和节点系统
- [x] 代码生成引擎
- [x] 拓扑排序
- [x] 类型检查
- [ ] 实时数据流预览
- [ ] 隐空间可视化（UMAP/t-SNE）
- [ ] 工作流保存/分享
- [ ] 多用户协作

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License

## 联系我们

- 项目主页：https://github.com/yourusername/medical-ai-workflow
- 问题反馈：https://github.com/yourusername/medical-ai-workflow/issues
- 邮件：contact@medical-ai-workflow.com

---

**Made with ❤️ for Medical AI Research**
