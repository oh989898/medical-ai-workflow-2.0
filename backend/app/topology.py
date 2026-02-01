"""
拓扑排序引擎 - 将工作流节点图转换为执行顺序
"""
from typing import List, Dict, Set, Tuple
from collections import defaultdict, deque
from .models import Workflow, NodeInstance, Connection


class TopologyEngine:
    """工作流拓扑排序引擎"""
    
    @staticmethod
    def build_dependency_graph(workflow: Workflow) -> Tuple[Dict[str, List[str]], Dict[str, int]]:
        """
        构建依赖图和入度表
        
        Returns:
            graph: 邻接表，key为节点ID，value为依赖该节点的节点列表
            in_degree: 入度表，key为节点ID，value为入度
        """
        # 初始化
        graph = defaultdict(list)
        in_degree = defaultdict(int)
        
        # 所有节点入度初始化为0
        for node in workflow.nodes:
            in_degree[node.id] = 0
        
        # 根据连接构建依赖关系
        for conn in workflow.connections:
            # source -> target，target依赖于source
            graph[conn.source].append(conn.target)
            in_degree[conn.target] += 1
        
        return dict(graph), dict(in_degree)
    
    @staticmethod
    def topological_sort(workflow: Workflow) -> List[str]:
        """
        对节点进行拓扑排序
        
        Returns:
            按执行顺序排列的节点ID列表
        """
        graph, in_degree = TopologyEngine.build_dependency_graph(workflow)
        
        # Kahn算法
        queue = deque()
        result = []
        
        # 找到所有入度为0的节点（没有依赖的节点）
        for node_id, degree in in_degree.items():
            if degree == 0:
                queue.append(node_id)
        
        while queue:
            current = queue.popleft()
            result.append(current)
            
            # 减少邻接节点的入度
            for neighbor in graph.get(current, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # 检查是否有环
        if len(result) != len(workflow.nodes):
            unprocessed = set(node.id for node in workflow.nodes) - set(result)
            raise ValueError(f"工作流中存在循环依赖，无法处理的节点: {unprocessed}")
        
        return result
    
    @staticmethod
    def get_execution_plan(workflow: Workflow) -> List[Dict]:
        """
        获取完整的执行计划
        
        Returns:
            包含节点ID、类型、输入来源的执行计划
        """
        sorted_ids = TopologyEngine.topological_sort(workflow)
        
        # 构建节点ID到节点实例的映射
        node_map = {node.id: node for node in workflow.nodes}
        
        # 构建连接查找表
        connection_map = {}
        for conn in workflow.connections:
            key = (conn.target, conn.target_input)
            connection_map[key] = {
                'source_node': conn.source,
                'source_output': conn.source_output
            }
        
        execution_plan = []
        for node_id in sorted_ids:
            node = node_map[node_id]
            
            # 查找该节点的输入连接
            inputs = {}
            for input_def in node.data.get('inputs', {}):
                key = (node_id, input_def)
                if key in connection_map:
                    inputs[input_def] = connection_map[key]
            
            execution_plan.append({
                'node_id': node_id,
                'node_type': node.type,
                'parameters': node.data.get('parameters', {}),
                'inputs': inputs,
                'position': node.position
            })
        
        return execution_plan
    
    @staticmethod
    def validate_workflow(workflow: Workflow) -> Tuple[bool, List[str]]:
        """
        验证工作流是否有效
        
        Returns:
            (是否有效, 错误信息列表)
        """
        errors = []
        
        # 1. 检查节点ID唯一性
        node_ids = [node.id for node in workflow.nodes]
        if len(node_ids) != len(set(node_ids)):
            errors.append("存在重复的节点ID")
        
        # 2. 检查连接引用的节点是否存在
        node_id_set = set(node_ids)
        for conn in workflow.connections:
            if conn.source not in node_id_set:
                errors.append(f"连接引用了不存在的源节点: {conn.source}")
            if conn.target not in node_id_set:
                errors.append(f"连接引用了不存在的目标节点: {conn.target}")
        
        # 3. 检查是否有循环依赖
        try:
            TopologyEngine.topological_sort(workflow)
        except ValueError as e:
            errors.append(str(e))
        
        # 4. 检查输入节点是否有数据源
        input_nodes = [n for n in workflow.nodes if n.type in ['image_folder', 'pathology_wsi', 'clinical_csv']]
        if not input_nodes:
            errors.append("工作流缺少输入节点")
        
        # 5. 检查是否有输出节点（head节点）
        head_nodes = [n for n in workflow.nodes if n.type in ['classifier', 'survival_head', 'segmentation_head']]
        if not head_nodes:
            errors.append("工作流缺少下游任务节点（Head）")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def get_data_flow(workflow: Workflow) -> Dict[str, Dict]:
        """
        分析数据流
        
        Returns:
            每个节点的输入输出数据类型信息
        """
        sorted_ids = TopologyEngine.topological_sort(workflow)
        node_map = {node.id: node for node in workflow.nodes}
        
        # 构建连接映射
        connection_map = {}
        for conn in workflow.connections:
            connection_map[(conn.target, conn.target_input)] = conn
        
        data_flow = {}
        
        for node_id in sorted_ids:
            node = node_map[node_id]
            
            # 获取输入数据类型
            input_types = {}
            for input_key in node.data.get('inputs', {}).keys():
                conn_key = (node_id, input_key)
                if conn_key in connection_map:
                    conn = connection_map[conn_key]
                    source_node = node_map.get(conn.source)
                    if source_node:
                        input_types[input_key] = {
                            'source_node': conn.source,
                            'source_output': conn.source_output,
                            'source_type': source_node.type
                        }
            
            data_flow[node_id] = {
                'node_type': node.type,
                'inputs': input_types,
                'outputs': []  # 将在后续分析中填充
            }
        
        return data_flow
