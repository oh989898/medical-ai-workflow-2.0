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
        config_yaml = self._generate_config_yaml(workflow_info)
        requirements_txt = self._generate_requirements_txt(workflow_info)
        readme_md = self._generate_readme_md(workflow_info)
        
        return CodeGenerationResult(
            main_py=main_py,
            model_py=model_py,
            dataset_py=dataset_py,
            config_yaml=config_yaml,
            requirements_txt=requirements_txt,
            readme_md=readme_md
        )
    
    def _analyze_workflow(self, workflow: Workflow, execution_plan: List[Dict]) -> Dict[str, Any]:
        """分析工作流结构，提取生成代码所需信息"""
        info = {
            'project_name': workflow.name or 'Medical AI Project',
            'encoders': [],
            'transforms': [],
            'heads': [],
            'fusion': None,
            'config_nodes': {},
            'input_type': None,
            'task_type': None
        }
        
        for step in execution_plan:
            node_type = step['node_type']
            params = step['parameters']
            
            # 输入节点
            if node_type in ['image_folder', 'pathology_wsi', 'clinical_csv']:
                info['input_type'] = node_type
                info['input_params'] = params
            
            # 预处理节点
            elif node_type in ['resize', 'normalize', 'stain_normalization', 'data_augmentation']:
                transform_info = {
                    'type': node_type,
                    **params
                }
                info['transforms'].append(transform_info)
            
            # 编码器节点
            elif node_type in ['resnet50', 'vit', 'titan', 'conch', 'bert']:
                encoder_info = {
                    'id': step['node_id'],
                    'type': node_type,
                    'name': node_type.upper(),
                    **params
                }
                info['encoders'].append(encoder_info)
            
            # 融合节点
            elif node_type in ['concat', 'cross_attention', 'attention_mil']:
                info['fusion'] = {
                    'type': node_type,
                    'name': node_type.replace('_', ' ').title(),
                    **params
                }
            
            # 任务头节点
            elif node_type in ['classifier', 'survival_head', 'segmentation_head']:
                head_info = {
                    'type': node_type,
                    'name': node_type.replace('_', ' ').title(),
                    **params
                }
                info['heads'].append(head_info)
                
                # 确定任务类型
                if node_type == 'classifier':
                    info['task_type'] = 'classification'
                elif node_type == 'survival_head':
                    info['task_type'] = 'survival'
                elif node_type == 'segmentation_head':
                    info['task_type'] = 'segmentation'
            
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
        info['loss_function'] = self._map_loss_function(
            config.get('loss_function', {}).get('type', 'cross_entropy')
        )
        info['loss_weight'] = config.get('loss_function', {}).get('weight', 1.0)
        info['warmup_epochs'] = config.get('scheduler', {}).get('warmup_epochs', 5)
        
        # 数据路径
        info['train_dir'] = './data/train'
        info['val_dir'] = './data/val'
        info['test_dir'] = './data/test'
        
        return info
    
    def _map_loss_function(self, loss_type: str) -> str:
        """映射损失函数名称"""
        mapping = {
            'cross_entropy': 'CrossEntropyLoss',
            'bce': 'BCEWithLogitsLoss',
            'focal': 'FocalLoss',  # 需要自定义实现
            'dice': 'DiceLoss',    # 需要自定义实现
            'contrastive': 'ContrastiveLoss'  # 需要自定义实现
        }
        return mapping.get(loss_type, 'CrossEntropyLoss')
    
    def _generate_main_py(self, info: Dict[str, Any]) -> str:
        """生成主训练脚本"""
        template = Template(self.templates['main_py'])
        return template.render(**info)
    
    def _generate_model_py(self, info: Dict[str, Any]) -> str:
        """生成模型定义文件"""
        # 计算维度
        if info['encoders']:
            encoder_output_dims = {
                'resnet50': 2048,
                'vit': 768,
                'titan': 768,
                'conch': 512,
                'bert': 768
            }
            
            total_dim = sum(
                encoder_output_dims.get(enc['type'], 2048)
                for enc in info['encoders']
            )
            
            info['encoder_output_dim'] = total_dim
            
            # 为融合层设置维度
            if info['fusion']:
                if info['fusion']['type'] == 'concat':
                    info['fusion']['input_dim'] = total_dim
                    info['fusion']['output_dim'] = total_dim
                elif info['fusion']['type'] == 'attention_mil':
                    info['fusion']['input_dim'] = encoder_output_dims.get(
                        info['encoders'][0]['type'], 2048
                    )
            
            # 为head设置输入维度
            head_input_dim = info['fusion']['output_dim'] if info['fusion'] else total_dim
            for head in info['heads']:
                head['input_dim'] = head_input_dim
        
        # 收集特殊组件类型
        info['fusion_types'] = [info['fusion']['type']] if info['fusion'] else []
        info['head_types'] = [head['type'] for head in info['heads']]
        info['encoder_types'] = [enc['type'] for enc in info['encoders']]
        
        template = Template(self.templates['model_py'])
        return template.render(**info)
    
    def _generate_dataset_py(self, info: Dict[str, Any]) -> str:
        """生成数据集定义文件"""
        # 提取特征列（如果是临床数据）
        if info['input_type'] == 'clinical_csv':
            info['feature_columns'] = info['input_params'].get('feature_columns', [])
            info['label_column'] = info['input_params'].get('label_column', 'label')
        
        # 收集输入类型
        info['input_types'] = [info['input_type']] if info['input_type'] else []
        
        template = Template(self.templates['dataset_py'])
        return template.render(**info)
    
    def _generate_config_yaml(self, info: Dict[str, Any]) -> str:
        """生成配置文件"""
        template = Template(self.templates['config_yaml'])
        return template.render(**info)
    
    def _generate_requirements_txt(self, info: Dict[str, Any]) -> str:
        """生成依赖文件"""
        # 收集特殊依赖
        info['input_types'] = [info['input_type']] if info['input_type'] else []
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
