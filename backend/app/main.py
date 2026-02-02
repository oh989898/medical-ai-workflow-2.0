"""
Medical AI Workflow - FastAPI后端服务
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn
from typing import Dict, List
import logging

from .models import Workflow, CodeGenerationResult, CodeGenerationRequest, NodeDefinition
from .topology import TopologyEngine
from .code_generator import generate_code

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# 创建FastAPI应用
app = FastAPI(
    title="Medical AI Workflow API",
    description="医学AI可视化工作流平台后端服务",
    version="1.0.0"
)


# 全局异常处理 - 捕获请求验证错误
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    logger.error(f"Request body: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={
            "message": "请求数据验证失败",
            "errors": exc.errors(),
            "detail": str(exc)
        }
    )

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Medical AI Workflow API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


@app.post("/api/generate-code", response_model=CodeGenerationResult)
async def generate_code_endpoint(request: CodeGenerationRequest):
    """
    生成代码API
    
    接收工作流定义，返回生成的Python代码
    """
    try:
        # 1. 验证工作流
        is_valid, errors = TopologyEngine.validate_workflow(request.workflow)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "工作流验证失败",
                    "errors": errors
                }
            )
        
        # 2. 生成代码
        result = generate_code(request.workflow)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "代码生成失败",
                "error": str(e)
            }
        )


@app.post("/api/validate-workflow")
async def validate_workflow_endpoint(workflow: Workflow):
    """
    验证工作流API
    
    检查工作流是否有效，返回验证结果
    """
    is_valid, errors = TopologyEngine.validate_workflow(workflow)
    
    return {
        "valid": is_valid,
        "errors": errors,
        "node_count": len(workflow.nodes),
        "connection_count": len(workflow.connections)
    }


@app.post("/api/analyze-topology")
async def analyze_topology_endpoint(workflow: Workflow):
    """
    分析工作流拓扑API
    
    返回工作流的拓扑排序和执行计划
    """
    try:
        # 拓扑排序
        sorted_nodes = TopologyEngine.topological_sort(workflow)
        
        # 执行计划
        execution_plan = TopologyEngine.get_execution_plan(workflow)
        
        # 数据流分析
        data_flow = TopologyEngine.get_data_flow(workflow)
        
        return {
            "sorted_nodes": sorted_nodes,
            "execution_plan": execution_plan,
            "data_flow": data_flow
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "拓扑分析失败",
                "error": str(e)
            }
        )


@app.get("/api/nodes/definitions")
async def get_node_definitions():
    """
    获取所有节点定义
    
    返回可用的节点类型列表
    """
    # 这里应该从节点注册表返回
    # 简化版本，返回基本结构
    return {
        "categories": [
            {"id": "input", "name": "数据输入", "color": "#10b981"},
            {"id": "transform", "name": "预处理", "color": "#f59e0b"},
            {"id": "encoder", "name": "特征编码", "color": "#3b82f6"},
            {"id": "fusion", "name": "特征融合", "color": "#8b5cf6"},
            {"id": "head", "name": "下游任务", "color": "#ef4444"},
            {"id": "config", "name": "训练配置", "color": "#6b7280"}
        ]
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """全局异常处理"""
    return JSONResponse(
        status_code=500,
        content={
            "message": "服务器内部错误",
            "error": str(exc)
        }
    )


# 启动入口
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )
