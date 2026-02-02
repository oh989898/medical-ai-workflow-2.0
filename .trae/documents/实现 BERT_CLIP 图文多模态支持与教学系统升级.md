## 任务目标：实现图文多模态（BERT/CLIP）支持与教程

针对您提出的 BERT 使用疑惑、缺少文本输入节点以及加入 CLIP 模块的需求，我制定了以下升级计划，确保“图文多模态”在平台中真正闭环并好用。

### 1. 补齐数据输入：新增“医学报告 (Medical Report)”节点
- **问题解决**：目前确实缺少专门输入纯文本的节点。
- **操作**：在 `registry.ts` 中新增 `medical_report` 节点。
- **功能**：支持加载包含“患者 ID”和“诊断报告文本”的 CSV 文件，输出 `text` 类型数据，完美对接 BERT。

### 2. 引入顶级多模态模型：新增“CLIP”编码节点
- **功能**：加入 `CLIP` 节点，它拥有双输入端口（Image 和 Text）。
- **优势**：CLIP 是目前图文对齐领域最强的模型，支持“以文搜图”或图文特征的深度融合。
- **实现**：后端自动调用 OpenAI CLIP 权重，并处理图像预处理与文本 Tokenization 的对齐。

### 3. 一键搭建：新增“图文多模态”画布模板
- **操作**：在导航栏新增 ✨ **“图文多模态模板”**。
- **预设场景**：
    - [Image Folder] → [ResNet/CLIP-Vision]
    - [Medical Report] → [BERT/CLIP-Text]
    - 以上两者 → [Gated Fusion] → [Classifier]
- **目的**：让小白点一下就能看到完整的图文 AI 架构是怎么连线的。

### 4. 底层强化：自动化文本处理
- **Dataset 升级**：在 [dataset.py](file:///Users/caitian/Desktop/2025吉大科研/AI病理书记组/节点化尝试/TRAE/medical-ai-workflow/backend/app/templates.py) 模板中加入 `AutoTokenizer`。生成的代码会自动将 CSV 里的中文/英文报告转化为模型能听懂的数字（Tokens）。
- **CLIP 逻辑**：在 [model.py](file:///Users/caitian/Desktop/2025吉大科研/AI病理书记组/节点化尝试/TRAE/medical-ai-workflow/backend/app/templates.py) 中内置 CLIP 的双塔转发逻辑。

### 5. 小白教程：图文 AI 专项指南
- **文档更新**：在 [HelpSystem.tsx](file:///Users/caitian/Desktop/2025吉大科研/AI病理书记组/节点化尝试/TRAE/medical-ai-workflow/frontend/src/components/HelpSystem.tsx) 中增加 **“如何训练一个能看懂报告的 AI”** 章节。
- **内容**：详细解释数据准备格式（CSV 怎么写）、BERT 与 CLIP 的区别，以及如何根据任务选择模型。

**确认后我将立即开始代码实现，让您的工作流真正具备“读图识字”的能力。**
