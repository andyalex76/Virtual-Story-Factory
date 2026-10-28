import React from 'react';
import { StoryContext } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { Book, AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react';

interface ReaderViewProps {
  story: StoryContext;
  selectedIndex: number;
  onSelectChapter: (index: number) => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ story, selectedIndex, onSelectChapter }) => {
  const currentViewChapter = story.chapters[selectedIndex];

  // Helper to determine status color/icon
  const getStatusIcon = (status: string) => {
      if (status === 'final') return <CheckCircle2 size={12} className="text-emerald-500" />;
      if (status === 'review') return <AlertCircle size={12} className="text-orange-500" />;
      return <CircleDashed size={12} className="text-slate-500" />;
  };

  return (
    <div className="flex h-full bg-slate-950">
       {/* TOC Sidebar */}
       <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
           <div className="p-4 border-b border-slate-800">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <Book size={14} /> Оглавление
               </h3>
           </div>
           <div className="flex-1 overflow-y-auto p-2 space-y-1">
               {story.chapters.length === 0 && (
                   <div className="text-center p-4 text-xs text-slate-600">Пока нет глав.</div>
               )}
               {story.chapters.map((chap, idx) => (
                   <button
                        key={chap.id}
                        onClick={() => onSelectChapter(idx)}
                        className={`w-full text-left px-3 py-2.5 rounded flex items-center justify-between group transition-all
                            ${selectedIndex === idx ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50 border border-transparent'}
                        `}
                   >
                       <span className={`text-xs font-medium truncate ${selectedIndex === idx ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                           {chap.title}
                       </span>
                       {getStatusIcon(chap.status)}
                   </button>
               ))}
           </div>
       </div>

       {/* Content Area */}
       <div className="flex-1 overflow-y-auto bg-slate-950 p-8 md:p-12">
            {currentViewChapter ? (
                <article className="max-w-2xl mx-auto">
                    <div className="mb-8 text-center">
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded border
                             ${currentViewChapter.status === 'final' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 
                               currentViewChapter.status === 'review' ? 'bg-orange-900/30 text-orange-400 border-orange-800' :
                               'bg-slate-800 text-slate-500 border-slate-700'}
                        `}>
                            {currentViewChapter.status === 'final' ? 'ФИНАЛЬНАЯ ВЕРСИЯ' : 'ЧЕРНОВИК В РАБОТЕ'}
                        </span>
                        <h1 className="text-3xl font-serif text-slate-100 font-bold mt-4 mb-2">{currentViewChapter.title}</h1>
                    </div>
                    
                    <div className="prose prose-invert prose-lg max-w-none font-serif leading-relaxed text-slate-300">
                        <MarkdownRenderer content={currentViewChapter.content} />
                    </div>

                    {currentViewChapter.feedback && (
                        <div className="mt-12 p-6 bg-orange-900/20 border border-orange-800/50 rounded-lg">
                            <h4 className="text-xs font-bold text-orange-400 uppercase mb-2 flex items-center gap-2">
                                <AlertCircle size={14} /> Отзыв критика
                            </h4>
                            <div className="text-sm text-orange-200/80 font-mono whitespace-pre-wrap">
                                <MarkdownRenderer content={currentViewChapter.feedback} />
                            </div>
                        </div>
                    )}
                </article>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                    <Book size={48} className="opacity-20 mb-4" />
                    <p className="text-sm">Выберите главу для чтения</p>
                </div>
            )}
       </div>
    </div>
  );
};

export default ReaderView;