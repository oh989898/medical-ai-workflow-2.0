## 1. 完善使用指南 (HelpSystem.tsx)
- 新增“数据准备指南”栏目。
- 详细说明三种输入节点的数据格式要求：
  - **Image Folder**: 树状结构说明（类别文件夹形式）。
  - **Clinical CSV**: 列名要求、数据类型限制、标签列规范。
  - **Pathology WSI**: 扫描倍数要求、切块逻辑说明。

## 2. 更新节点元数据 (registry.ts)
- 为 `image_folder`, `pathology_wsi`, `clinical_csv` 节点增加详细的 `tooltip`。
- 在参数说明中明确标注“建议文件组织形式”。

## 3. 改进代码生成模板 (templates.py)
- 优化 `README_TEMPLATE`，在生成的文档中根据用户选择的输入节点，动态生成数据存放建议：
  - 示例：如果是分类任务，自动展示 `data/train/class_a/` 这样的结构。
- 在 `dataset_py` 模板中增加更多注释，引导用户如何修改代码以适配特殊的数据格式。

## 4. 界面交互优化
- 在属性面板（PropertiesPanel）中，针对输入路径参数，增加一个“查看数据格式要求”的快捷链接。