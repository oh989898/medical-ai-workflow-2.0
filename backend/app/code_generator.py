"""
代码生成引擎 - 将工作流转换为Python代码
"""
from jinja2 import Template
from typing import Dict, List, Any
from .models import Workflow, CodeGenerationResult
from .topology import TopologyEngine
from .templates import TEMPLATES


class CodeGenerator:
    """代码生成引擎"""
    
    def __init__(self):
        self.templates = TEMPLATES
    
    def generate(self, workflow: Workflow) -> CodeGenerationResult:
        """
        生成完整的代码包
        
        Args:
            workflow: 工作流定义
            
        Returns:
            包含所有代码文件的字典
        """
        # 1. 拓扑排序获取执行顺序
        execution_plan = TopologyEngine.get_execution_plan(workflow)
        
        # 2. 分析工作流结构
        workflow_info = self._analyze_workflow(workflow, execution_plan)
        
        # 3. 生成各个代码文件
        main_py = self._generate_main_py(workflow_info)
        model_py = self._generate_model_py(workflow_info)
        dataset_py = self._generate_dataset_py(workflow_info)
        utils_py = self._generate_utils_py(workflow_info)
        setup_check_py = self._generate_setup_check_py(workflow_info)
        config_yaml = self._generate_config_yaml(workflow_info)
        requirements_txt = self._generate_requirements_txt(workflow_info)
        readme_md = self._generate_readme_md(workflow_info)
        
        return CodeGenerationResult(
            main_py=main_py,
            model_py=model_py,
            dataset_py=dataset_py,
            utils_py=utils_py,
            setup_check_py=setup_check_py,
            config_yaml=config_yaml,
            requirements_txt=requirements_txt,
            readme_md=readme_md
        )
    
    def _analyze_workflow(self, workflow: Workflow, execution_plan: List[Dict]) -> Dict[str, Any]:
        """分析工作流结构，提取生成代码所需信息"""
        info = {
            'project_name': workflow.name or 'Medical AI Project',
            'inputs': [],
            'encoders': [],
            'transforms': [],
            'heads': [],
            'fusion': None,
            'config_nodes': {},
            'task_type': None,
            'has_sam': False,
            'has_text_input': False,
            'text_model_name': 'bert-base-uncased',
            'max_length': 512
        }
        
        # 预定义元数据
        metadata = {
            'resnet50': {'description': '经典的ResNet50残差网络', 'paper_url': 'https://arxiv.org/abs/1512.03385'},
            'vit': {'description': 'Vision Transformer (ViT)', 'paper_url': 'https://arxiv.org/abs/2010.11929'},
            'swin': {'description': 'Swin Transformer (层次化Transformer)', 'paper_url': 'https://arxiv.org/abs/2103.14030'},
            'efficientnet': {'description': 'EfficientNet V2 (卷积网络巅峰)', 'paper_url': 'https://arxiv.org/abs/2104.00298'},
            'uni': {'description': 'UNI病理学大模型 (Harvard 开发)', 'paper_url': 'https://arxiv.org/abs/2308.11523'},
            'titan': {'description': 'TITAN病理基础模型', 'paper_url': 'https://github.com/hrlblab/TITAN'},
            'conch': {'description': 'CONCH病理视觉语言模型', 'paper_url': 'https://arxiv.org/abs/2309.04603'},
            'bert': {'description': 'BERT文本编码器', 'paper_url': 'https://arxiv.org/abs/1810.04805'},
            'clip': {'description': 'OpenAI CLIP图文多模态模型', 'paper_url': 'https://arxiv.org/abs/2103.00020'},
            'concat': {'description': '简单的特征拼接融合'},
            'cross_attention': {'description': '多模态交叉注意力融合'},
            'gated_fusion': {'description': '自动学习权重的门控融合'},
            'attention_mil': {'description': '基于注意力的多实例学习聚合'}
        }
        
        for step in execution_plan:
            node_type = step['node_type']
            params = step['parameters']
            
            # 输入节点
            if node_type in ['image_folder', 'pathology_wsi', 'clinical_csv', 'segmentation_dataset', 'medical_report']:
                input_info = {
                    'id': step['node_id'],
                    'type': node_type,
                    'params': params
                }
                info['inputs'].append(input_info)
                if node_type == 'medical_report':
                    info['has_text_input'] = True
            
            # 预处理节点
            elif node_type in ['resize', 'normalize', 'stain_normalization', 'data_augmentation']:
                transform_info = {
                    'type': node_type,
                    **params
                }
                info['transforms'].append(transform_info)
            
            # 编码器节点
            elif node_type in ['resnet50', 'vit', 'swin', 'efficientnet', 'uni', 'titan', 'conch', 'bert', 'clip']:
                # 确定输出维度
                dim_map = {
                    'resnet50': 2048,
                    'vit': 768 if params.get('model_size') == 'base' else (1024 if params.get('model_size') == 'large' else 1280),
                    'swin': 768 if params.get('variant') in ['tiny', 'small'] else 1024,
                    'efficientnet': 1280 if params.get('model_type') == 's' else (1408 if params.get('model_type') == 'm' else 1536),
                    'uni': 1024,
                    'titan': 768,
                    'conch': 512,
                    'bert': 768,
                    'clip': 512 if 'base' in params.get('model_variant', '') else 768
                }
                out_dim = dim_map.get(node_type, 768)
                
                # 如果是文本编码器，更新 tokenizer 信息
                if node_type == 'bert':
                    info['text_model_name'] = params.get('model_name', 'bert-base-uncased')
                    info['max_length'] = params.get('max_length', 512)
                elif node_type == 'clip':
                    info['text_model_name'] = params.get('model_variant', 'openai/clip-vit-base-patch32')
                    info['max_length'] = 77 # CLIP 默认 77
                
                encoder_info = {
                    'id': step['node_id'],
                    'type': node_type,
                    'name': node_type.upper(),
                    'description': metadata.get(node_type, {}).get('description', ''),
                    'paper_url': metadata.get(node_type, {}).get('paper_url', ''),
                    'out_dim': out_dim,
                    **params
                }
                info['encoders'].append(encoder_info)
            
            # 融合节点
            elif node_type in ['concat', 'cross_attention', 'gated_fusion', 'attention_mil']:
                # 计算输入总维度
                total_in_dim = sum([e['out_dim'] for e in info['encoders']])
                # 如果有临床数据输入，也加上
                for inp in info['inputs']:
                    if inp['type'] == 'clinical_csv':
                        total_in_dim += len(inp['params'].get('feature_columns', []))

                info['fusion'] = {
                    'type': node_type,
                    'name': node_type.replace('_', ' ').title(),
                    'description': metadata.get(node_type, {}).get('description', ''),
                    'input_dim': total_in_dim,
                    'output_dim': 512, # 融合后默认降维到512
                    **params
                }
            
            # 任务头节点
            elif node_type in ['classifier', 'survival_head', 'segmentation_head', 'sam_segmentor']:
                # 确定输入维度
                if info['fusion']:
                    in_dim = info['fusion']['output_dim']
                elif info['encoders']:
                    in_dim = info['encoders'][0]['out_dim']
                else:
                    # 仅临床数据
                    in_dim = sum([len(inp['params'].get('feature_columns', [])) for inp in info['inputs'] if inp['type'] == 'clinical_csv'])

                head_info = {
                    'id': step['node_id'],
                    'type': node_type,
                    'name': node_type.replace('_', ' ').title(),
                    'input_dim': in_dim,
                    **params
                }
                info['heads'].append(head_info)
                
                # 确定任务类型
                if node_type == 'classifier':
                    info['task_type'] = 'classification'
                elif node_type == 'survival_head':
                    info['task_type'] = 'survival'
                elif node_type in ['segmentation_head', 'sam_segmentor']:
                    info['task_type'] = 'segmentation'
                
                if node_type == 'sam_segmentor':
                    info['has_sam'] = True
                    info['sam_node'] = head_info
            
            # 配置节点
            elif node_type in ['optimizer', 'scheduler', 'loss_function', 'training_config']:
                info['config_nodes'][node_type] = params
        
        # 设置默认值
        if not info['task_type']:
            info['task_type'] = 'classification'
        
        # 提取配置
        config = info['config_nodes']
        info['batch_size'] = config.get('training_config', {}).get('batch_size', 32)
        info['epochs'] = config.get('training_config', {}).get('epochs', 100)
        info['learning_rate'] = config.get('optimizer', {}).get('lr', 0.0001)
        info['weight_decay'] = config.get('optimizer', {}).get('weight_decay', 0.01)
        info['gradient_clip'] = config.get('training_config', {}).get('gradient_clip', 1.0)
        info['optimizer'] = config.get('optimizer', {}).get('type', 'AdamW').capitalize()
        info['scheduler'] = config.get('scheduler', {}).get('type', 'CosineAnnealingLR')
        # 确定损失函数
        loss_type = config.get('loss_function', {}).get('type')
        if not loss_type:
            if info['task_type'] == 'survival':
                loss_type = 'survival'
            elif info['task_type'] == 'segmentation':
                loss_type = 'dice'
            else:
                loss_type = 'cross_entropy'
                
        loss_info = self._map_loss_function(loss_type)
        info['loss_function'] = loss_info['name']
        info['loss_is_custom'] = loss_info['custom']
        info['loss_weight'] = config.get('loss_function', {}).get('weight', 1.0)
        info['warmup_epochs'] = config.get('scheduler', {}).get('warmup_epochs', 5)
        
        # 数据路径
        info['train_dir'] = './data/train'
        info['val_dir'] = './data/val'
        info['test_dir'] = './data/test'
        
        return info
    
    def _map_loss_function(self, loss_type: str) -> Dict[str, Any]:
        """映射损失函数名称和来源"""
        mapping = {
            'cross_entropy': {'name': 'CrossEntropyLoss', 'custom': False},
            'bce': {'name': 'BCEWithLogitsLoss', 'custom': False},
            'focal': {'name': 'FocalLoss', 'custom': True},
            'dice': {'name': 'DiceLoss', 'custom': True},
            'survival': {'name': 'CoxLoss', 'custom': True},
            'contrastive': {'name': 'ContrastiveLoss', 'custom': True}
        }
        return mapping.get(loss_type, {'name': 'CrossEntropyLoss', 'custom': False})
    
    def _generate_main_py(self, info: Dict[str, Any]) -> str:
        """生成主训练脚本"""
        template = Template(self.templates['main_py'])
        return template.render(**info)
    
    def _generate_model_py(self, info: Dict[str, Any]) -> str:
        """生成模型定义文件"""
        # 收集组件类型，用于模板中的条件判断
        info['fusion_types'] = [info['fusion']['type']] if info['fusion'] else []
        info['encoder_types'] = [enc['type'] for enc in info['encoders']]
        info['head_types'] = [head['type'] for head in info['heads']]
        
        # 提取head名称和描述用于README
        if info['heads']:
            info['head_name'] = info['heads'][0]['name']
            info['head_description'] = info['heads'][0].get('description', '')
        else:
            info['head_name'] = 'Task Head'
            info['head_description'] = 'Downstream task head'

        template = Template(self.templates['model_py'])
        return template.render(**info)
    
    def _generate_dataset_py(self, info: Dict[str, Any]) -> str:
        """生成数据集定义文件"""
        # 收集输入类型
        info['input_types'] = [inp['type'] for inp in info['inputs']]
        
        # 为每个输入提取参数
        for inp in info['inputs']:
            if inp['type'] == 'clinical_csv':
                inp['feature_columns'] = inp['params'].get('feature_columns', [])
                inp['label_column'] = inp['params'].get('label_column', 'label')
            elif inp['type'] == 'segmentation_dataset':
                inp['images_path'] = inp['params'].get('images_path', '')
                inp['masks_path'] = inp['params'].get('masks_path', '')
        
        template = Template(self.templates['dataset_py'])
        return template.render(**info)
    
    def _generate_utils_py(self, info: Dict[str, Any]) -> str:
        """生成工具类文件"""
        template = Template(self.templates['utils_py'])
        return template.render(**info)
        
    def _generate_setup_check_py(self, info: Dict[str, Any]) -> str:
        """生成自检脚本文件"""
        template = Template(self.templates['setup_check_py'])
        return template.render(**info)
    
    def _generate_config_yaml(self, info: Dict[str, Any]) -> str:
        """生成配置文件"""
        template = Template(self.templates['config_yaml'])
        return template.render(**info)
    
    def _generate_requirements_txt(self, info: Dict[str, Any]) -> str:
        """生成依赖文件"""
        # 收集特殊依赖
        info['input_types'] = [inp['type'] for inp in info['inputs']]
        info['encoder_types'] = [enc['type'] for enc in info['encoders']]
        info['transforms'] = [t['type'] for t in info['transforms']]
        
        template = Template(self.templates['requirements_txt'])
        return template.render(**info)
    
    def _generate_readme_md(self, info: Dict[str, Any]) -> str:
        """生成README文档"""
        # 设置head信息
        if info['heads']:
            info['head_name'] = info['heads'][0]['name']
            info['head_description'] = self._get_head_description(info['heads'][0]['type'])
        else:
            info['head_name'] = 'Unknown'
            info['head_description'] = 'No head configured'
        
        template = Template(self.templates['readme_md'])
        return template.render(**info)
    
    def _get_head_description(self, head_type: str) -> str:
        """获取任务头描述"""
        descriptions = {
            'classifier': '分类头，用于二分类或多分类任务',
            'survival_head': '生存分析头，用于预测生存时间',
            'segmentation_head': '分割头，用于图像分割任务'
        }
        return descriptions.get(head_type, '未知任务头')
    
    def generate_node_code(self, node_type: str, params: Dict[str, Any]) -> str:
        """
        生成单个节点的代码片段
        
        Args:
            node_type: 节点类型
            params: 节点参数
            
        Returns:
            代码字符串
        """
        template_str = self.templates['nodes'].get(node_type)
        if not template_str:
            return f"# Node type '{node_type}' not implemented yet"
        
        template = Template(template_str)
        return template.render(**params)


# 单例实例
code_generator = CodeGenerator()


def generate_code(workflow: Workflow) -> CodeGenerationResult:
    """便捷的代码生成函数"""
    return code_generator.generate(workflow)
