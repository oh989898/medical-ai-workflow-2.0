#!/bin/bash

# Medical AI Workflow 启动脚本

echo "=========================================="
echo "Medical AI Workflow 平台"
echo "=========================================="
echo ""

# 检查是否提供了参数
if [ "$1" = "backend" ]; then
    echo "启动后端服务..."
    cd backend
    
    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        echo "创建Python虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 安装依赖
    echo "安装后端依赖..."
    pip install -q -r requirements.txt
    
    # 启动服务
    echo "启动FastAPI服务 (http://localhost:8000)..."
    python -m app.main
    
elif [ "$1" = "frontend" ]; then
    echo "启动前端服务..."
    cd frontend
    
    # 检查node_modules
    if [ ! -d "node_modules" ]; then
        echo "安装前端依赖..."
        npm install
    fi
    
    # 启动开发服务器
    echo "启动Vite开发服务器 (http://localhost:3000)..."
    npm run dev
    
elif [ "$1" = "all" ]; then
    echo "同时启动前后端服务..."
    
    # 启动后端（后台）
    cd backend
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -q -r requirements.txt
    python -m app.main &
    BACKEND_PID=$!
    cd ..
    
    echo "后端服务已启动 (PID: $BACKEND_PID)"
    
    # 启动前端
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo "前端服务已启动 (PID: $FRONTEND_PID)"
    echo ""
    echo "服务地址:"
    echo "  前端: http://localhost:3000"
    echo "  后端: http://localhost:8000"
    echo ""
    echo "按 Ctrl+C 停止所有服务"
    
    # 等待中断信号
    trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
    wait
    
else
    echo "用法: ./start.sh [backend|frontend|all]"
    echo ""
    echo "选项:"
    echo "  backend  - 只启动后端服务"
    echo "  frontend - 只启动前端服务"
    echo "  all      - 同时启动前后端服务"
    echo ""
    echo "示例:"
    echo "  ./start.sh all"
fi
