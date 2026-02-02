import { useState } from 'react';
import { NodeLibrary, PropertiesPanel, WorkflowCanvas, HelpSystem } from '@/components';
import { Github, BookOpen, Stethoscope } from 'lucide-react';

function App() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col gradient-bg">
      {/* 顶部导航栏 - Apple 风格玻璃态 */}
      <header className="h-16 glass-nav flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-lg tracking-tight">Medical AI Workflow</h1>
            <p className="text-xs text-gray-500 font-medium">医学AI可视化工作流平台</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHelpOpen(true)}
            className="apple-button apple-button-primary px-5 py-2 text-sm flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            使用指南
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-2" />
          
          <nav className="flex items-center gap-3">
            <a 
              href="#" 
              className="apple-button apple-button-secondary px-4 py-2 text-sm flex items-center gap-2"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        <div className="apple-card overflow-hidden flex-shrink-0">
          <NodeLibrary />
        </div>
        
        <div className="apple-card flex-1 overflow-hidden">
          <WorkflowCanvas />
        </div>
        
        <div className="apple-card overflow-hidden flex-shrink-0">
          <PropertiesPanel />
        </div>
      </main>

      {/* 帮助系统 */}
      <HelpSystem isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}

export default App;
