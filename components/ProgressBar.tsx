import React from 'react';
import { Stage, Role, TokenUsage } from '../types';
import { CheckCircle2, PenTool, Search, BookOpen, BrainCircuit, Bot, Cpu, Zap, Palette } from 'lucide-react';

interface ProgressBarProps {
  currentStage: Stage;
  activeAgent: Role | null;
  tokenUsage: TokenUsage;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStage, activeAgent, tokenUsage }) => {
  const steps = [
    { id: Stage.INIT, label: 'Настройка', icon: BrainCircuit },
    { id: Stage.BRIEF, label: 'Story Bible', icon: BookOpen },
    { id: Stage.WRITING, label: 'Написание', icon: PenTool },
    { id: Stage.CRITIQUE, label: 'Контроль', icon: Search },
    { id: Stage.RELEASE, label: 'Релиз', icon: CheckCircle2 },
  ];

  // Map steps to indices to determine progress line
  const stageOrder = [Stage.INIT, Stage.BRIEF, Stage.WRITING, Stage.CRITIQUE, Stage.RELEASE];
  const currentIndex = stageOrder.indexOf(currentStage);

  const agents = [
      { 
        id: 'editor', 
        label: 'РЕДАКТОР', 
        role: 'editor', 
        icon: Bot, 
        colorClass: 'text-sky-400', 
        borderClass: 'border-sky-500/50', 
        bgActive: 'bg-sky-950', 
        dotColor: 'bg-sky-400',
        description: 'Оркестратор'
      },
      { 
        id: 'writer', 
        label: 'ПИСАТЕЛЬ', 
        role: 'writer', 
        icon: PenTool, 
        colorClass: 'text-emerald-400', 
        borderClass: 'border-emerald-500/50', 
        bgActive: 'bg-emerald-950', 
        dotColor: 'bg-emerald-400',
        description: 'Генерация'
      },
      { 
        id: 'reader', 
        label: 'КРИТИК', 
        role: 'reader', 
        icon: Search, 
        colorClass: 'text-orange-400', 
        borderClass: 'border-orange-500/50', 
        bgActive: 'bg-orange-950', 
        dotColor: 'bg-orange-400',
        description: 'Анализ'
      },
      { 
        id: 'designer', 
        label: 'ДИЗАЙНЕР', 
        role: 'designer', 
        icon: Palette, 
        colorClass: 'text-purple-400', 
        borderClass: 'border-purple-500/50', 
        bgActive: 'bg-purple-950', 
        dotColor: 'bg-purple-400',
        description: 'Оформление'
      },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 w-64 shrink-0 shadow-2xl z-20">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <h1 className="text-lg font-black text-slate-100 tracking-tight flex items-center gap-2">
          <BrainCircuit className="text-sky-500" size={20} />
          <span>STORY<span className="text-sky-500">FACTORY</span></span>
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 pl-7">AI Production OS</p>
      </div>

      {/* Progress Steps */}
      <div className="flex-1 p-6 relative overflow-y-auto custom-scrollbar">
        <div className="absolute left-[29px] top-8 bottom-8 w-0.5 bg-slate-800 z-0" />
        
        <div className="space-y-8 relative z-10">
            {steps.map((step, idx) => {
                const isActive = idx === currentIndex;
                const isPast = idx < currentIndex;
                const Icon = step.icon;

                return (
                    <div key={step.id} className={`flex items-center gap-4 transition-all duration-500 ${isActive ? 'translate-x-1' : ''}`}>
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10
                            ${isActive ? 'bg-sky-600 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-110' : 
                              isPast ? 'bg-slate-900 border-sky-900 text-sky-600' : 'bg-slate-950 border-slate-800 text-slate-700'}
                        `}>
                            <Icon size={14} />
                        </div>
                        <div>
                            <span className={`text-xs font-bold uppercase tracking-wide block transition-colors duration-300 ${isActive ? 'text-white' : isPast ? 'text-slate-400' : 'text-slate-600'}`}>
                                {step.label}
                            </span>
                            {isActive && (
                                <span className="text-[9px] text-sky-400 animate-pulse font-mono tracking-tight block mt-0.5">
                                    В ПРОЦЕССЕ
                                </span>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
      </div>

      {/* Neural Workers Section */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Cpu size={12} />
                Нейро-агенты
            </p>
        </div>
        <div className="space-y-3">
            {agents.map(agent => {
                const isWorking = activeAgent === agent.role;
                const Icon = agent.icon;
                
                return (
                    <div key={agent.id} 
                        className={`
                            relative flex items-center justify-between p-3 rounded-lg border transition-all duration-300 overflow-hidden group
                            ${isWorking 
                                ? `${agent.bgActive} ${agent.borderClass} shadow-lg ring-1 ring-inset ring-white/5` 
                                : 'bg-slate-800/20 border-slate-800/50 opacity-70 hover:opacity-100 hover:bg-slate-800/40 hover:border-slate-700'}
                        `}
                    >
                        {/* Background Pulse Overlay for Active State */}
                        {isWorking && (
                            <div className="absolute inset-0 bg-white/5 animate-pulse" />
                        )}

                        <div className="flex items-center gap-3 relative z-10">
                            <div className={`
                                p-2 rounded-md transition-all duration-300
                                ${isWorking 
                                    ? `bg-slate-950 ${agent.colorClass} scale-110 shadow-inner` 
                                    : 'bg-slate-900 text-slate-600'}
                            `}>
                                <Icon size={14} className={isWorking ? 'animate-bounce' : ''} />
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold tracking-wider transition-colors duration-300 ${isWorking ? 'text-slate-100' : 'text-slate-500'}`}>
                                    {agent.label}
                                </span>
                                <span className="text-[8px] font-medium text-slate-600 uppercase tracking-tight">
                                    {isWorking ? 'В работе...' : agent.description}
                                </span>
                            </div>
                        </div>
                        
                        <div className="relative z-10 flex items-center">
                             {isWorking ? (
                                <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${agent.dotColor}`}></span>
                                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${agent.dotColor}`}></span>
                                    </span>
                                    <span className={`text-[8px] font-bold ${agent.colorClass}`}>ВКЛ</span>
                                </div>
                             ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800 ring-1 ring-slate-700" title="Ожидание" />
                             )}
                        </div>
                    </div>
                )
            })}
        </div>

        {/* Token Usage Stats */}
        <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={12} className={tokenUsage.total > 0 ? "text-yellow-500" : ""} />
                    Нагрузка
                 </p>
                 <span className="text-[10px] font-mono text-slate-400">{formatNumber(tokenUsage.total)} T</span>
            </div>
            <div className="flex gap-1 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div 
                    className="bg-sky-600 h-full transition-all duration-500" 
                    style={{ width: `${tokenUsage.total > 0 ? (tokenUsage.input / tokenUsage.total) * 100 : 0}%` }} 
                />
                <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${tokenUsage.total > 0 ? (tokenUsage.output / tokenUsage.total) * 100 : 0}%` }} 
                />
            </div>
            <div className="flex justify-between mt-1 text-[8px] text-slate-600 font-mono uppercase">
                <span>IN: {formatNumber(tokenUsage.input)}</span>
                <span>OUT: {formatNumber(tokenUsage.output)}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;