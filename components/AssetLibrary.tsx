import React, { useState, useMemo } from 'react';
import { Asset } from '../types';
import { FileText, Image as ImageIcon, Box, ArrowDownUp, X, Download, Copy, Eye, FileType, RotateCcw } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface AssetLibraryProps {
  assets: Asset[];
  onRestoreAsset?: (asset: Asset) => void;
}

const CATEGORIES: { id: Asset['category'] | 'all', label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'reference', label: 'Рефы' },
  { id: 'style', label: 'Стиль' },
  { id: 'lore', label: 'Лор' },
  { id: 'output', label: 'Вывод' },
];

const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, onRestoreAsset }) => {
  const [activeFilter, setActiveFilter] = useState<Asset['category'] | 'all'>('all');
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const getAssetMeta = (type: Asset['type']) => {
    switch (type) {
      case 'image': 
      case 'generated_image':
        return { 
            icon: ImageIcon, 
            label: 'IMG',
            className: "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400 group-hover:border-purple-500/50 group-hover:from-purple-500/20 group-hover:to-pink-500/20 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
        };
      case 'pdf':
        return { 
            icon: FileType, 
            label: 'PDF',
            className: "bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 text-orange-400 group-hover:border-orange-500/50 group-hover:from-orange-500/20 group-hover:to-red-500/20 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]"
        };
      case 'text':
      default:
        return { 
            icon: FileText, 
            label: 'TXT',
            className: "bg-gradient-to-br from-sky-500/10 to-blue-500/10 border-sky-500/20 text-sky-400 group-hover:border-sky-500/50 group-hover:from-sky-500/20 group-hover:to-blue-500/20 group-hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]"
        };
    }
  };

  const getTimestamp = (id: string) => {
    const parts = id.split('-');
    if (parts.length >= 2) {
      const val = parseInt(parts[1], 10);
      return isNaN(val) ? 0 : val;
    }
    return 0;
  };

  const getAssetDate = (id: string) => {
    const timestamp = getTimestamp(id);
    if (timestamp > 1600000000000) {
        return new Date(timestamp).toLocaleString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
    }
    return '';
  };

  const handleDownload = (asset: Asset) => {
    const element = document.createElement("a");
    if (asset.url) {
        element.href = asset.url;
        element.download = asset.name;
    } else if (asset.content) {
        const file = new Blob([asset.content], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = asset.name.endsWith('.md') || asset.name.endsWith('.txt') ? asset.name : `${asset.name}.txt`;
    } else {
        return;
    }
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
        const tA = getTimestamp(a.id);
        const tB = getTimestamp(b.id);
        return sortNewestFirst ? tB - tA : tA - tB;
    });
  }, [assets, sortNewestFirst]);

  const categoriesToShow = activeFilter === 'all' 
    ? ['reference', 'style', 'lore', 'output'] 
    : [activeFilter];

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 w-72 overflow-hidden relative">
      {/* Header with Filters */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 space-y-3">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Box size={16} />
            Память проекта
            </h2>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setSortNewestFirst(!sortNewestFirst)}
                    className={`p-1 rounded hover:bg-slate-700 transition-colors ${sortNewestFirst ? 'text-sky-400' : 'text-slate-500'}`}
                    title={sortNewestFirst ? "Сначала новые" : "Сначала старые"}
                >
                    <ArrowDownUp size={14} />
                </button>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">
                    {assets.length}
                </span>
            </div>
        </div>
        
        {/* Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setActiveFilter(cat.id)}
                    className={`
                        px-2.5 py-1 text-[10px] uppercase font-bold tracking-wide rounded-md transition-all whitespace-nowrap flex-shrink-0
                        ${activeFilter === cat.id 
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20 ring-1 ring-sky-500' 
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300 border border-slate-700/50'
                        }
                    `}
                >
                    {cat.label}
                </button>
            ))}
        </div>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {assets.length === 0 && (
          <div className="text-center text-slate-600 mt-10">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Box size={24} className="opacity-50" />
            </div>
            <p className="text-sm">Пока нет файлов.</p>
            <p className="text-xs mt-1">Здесь появятся созданные или загруженные файлы.</p>
          </div>
        )}

        {categoriesToShow.map((cat) => {
          const catAssets = sortedAssets.filter(a => a.category === cat);
          
          if (catAssets.length === 0) {
             if (activeFilter !== 'all') {
                 return (
                    <div key={cat} className="text-center py-8 opacity-50">
                        <p className="text-xs text-slate-500">Файлы категории {cat} не найдены.</p>
                    </div>
                 );
             }
             return null;
          }

          return (
            <div key={cat} className="mb-6 last:mb-0">
              {activeFilter === 'all' && (
                  <h3 className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-2">
                      {cat}
                  </h3>
              )}
              
              <div className="space-y-2">
                {catAssets.map((asset) => {
                const { icon: Icon, label, className } = getAssetMeta(asset.type);
                const dateStr = getAssetDate(asset.id);
                
                return (
                    <div 
                        key={asset.id} 
                        onClick={() => setSelectedAsset(asset)}
                        className="bg-slate-800/50 hover:bg-slate-800 rounded-lg p-2.5 transition-all border border-slate-700/50 hover:border-slate-600 group relative cursor-pointer active:scale-[0.98]"
                    >
                        <div className="flex items-start gap-3">
                            {/* Asset Icon/Type Indicator */}
                            <div className={`shrink-0 mt-0.5 w-10 h-10 rounded-md flex items-center justify-center border transition-all duration-500 ${className}`}>
                                <Icon size={18} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" />
                            </div>
                            
                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-200 truncate leading-snug group-hover:text-sky-400 transition-colors" title={asset.name}>{asset.name}</p>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 border border-slate-600 shadow-sm`}>
                                        {label}
                                    </span>
                                    {dateStr && (
                                        <span className="text-[9px] text-slate-400 font-mono font-medium">
                                            {dateStr}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Image Preview */}
                        {asset.url && (
                            <div className="mt-2.5 rounded overflow-hidden h-24 w-full bg-slate-900 relative border border-slate-700/30">
                                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="text-white drop-shadow-md" size={24} />
                                </div>
                            </div>
                        )}
                        
                        {/* Text Preview */}
                        {asset.content && !asset.url && (
                            <div className="mt-2 text-[9px] text-slate-500 line-clamp-2 bg-slate-900/50 p-1.5 rounded border border-slate-800 group-hover:border-slate-700 group-hover:text-slate-400 transition-colors">
                                {asset.content.substring(0, 100)}
                            </div>
                        )}
                    </div>
                );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal Overlay */}
      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
             onClick={() => setSelectedAsset(null)}
           />
           
           {/* Modal Panel */}
           <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-2.5 rounded-lg border ${getAssetMeta(selectedAsset.type).className.replace('group-hover:', 'hover:')}`}>
                        {React.createElement(getAssetMeta(selectedAsset.type).icon, { size: 20 })}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-slate-200 truncate text-sm">{selectedAsset.name}</h3>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{selectedAsset.category}</p>
                    </div>
                 </div>
                 <button 
                    onClick={() => setSelectedAsset(null)} 
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
                 >
                    <X size={20} />
                 </button>
              </div>
              
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto bg-slate-950/30">
                 {/* Image View */}
                 {selectedAsset.url && (
                    <div className="bg-slate-950 relative flex items-center justify-center p-4 border-b border-slate-800 min-h-[200px] overflow-hidden group/image">
                       {/* Checkered background for transparency */}
                       <div className="absolute inset-0 opacity-20" style={{
                           backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                           backgroundSize: '10px 10px'
                       }}/>
                       
                       <img 
                          src={selectedAsset.url} 
                          alt={selectedAsset.name} 
                          className="relative z-10 max-w-full max-h-[60vh] w-auto h-auto object-contain rounded-md shadow-2xl ring-1 ring-slate-800" 
                       />
                    </div>
                 )}
                 
                 {/* Text Content */}
                 {selectedAsset.content && (
                    <div className="p-0 bg-slate-950 min-h-[200px]">
                       <div className="p-6">
                          <MarkdownRenderer content={selectedAsset.content} />
                       </div>
                    </div>
                 )}

                 {/* Metadata Section */}
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-t border-slate-800 bg-slate-900/30 text-xs">
                    <div>
                       <span className="block font-bold text-slate-500 uppercase mb-1">Тип</span>
                       <span className="text-slate-300">{selectedAsset.type}</span>
                    </div>
                    <div>
                       <span className="block font-bold text-slate-500 uppercase mb-1">Создано</span>
                       <span className="text-slate-300">{getAssetDate(selectedAsset.id)}</span>
                    </div>
                    <div className="col-span-2">
                       <span className="block font-bold text-slate-500 uppercase mb-1">ID</span>
                       <span className="text-slate-500 font-mono truncate block select-all">{selectedAsset.id}</span>
                    </div>
                 </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0 flex justify-end gap-3">
                  {onRestoreAsset && selectedAsset.name.toLowerCase().includes('chapter_') && (
                      <button 
                        onClick={() => {
                            onRestoreAsset(selectedAsset);
                            setSelectedAsset(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 hover:text-orange-300 text-xs font-bold uppercase tracking-wide border border-orange-500/30 transition-colors mr-auto"
                      >
                         <RotateCcw size={14} />
                         Откатиться к этой версии
                      </button>
                  )}
                  {selectedAsset.content && (
                      <button 
                        onClick={() => handleCopy(selectedAsset.content!)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wide border border-slate-700 transition-colors"
                      >
                         <Copy size={14} />
                         Копировать
                      </button>
                  )}
                  <button 
                    onClick={() => handleDownload(selectedAsset)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wide shadow-lg shadow-sky-900/20 transition-colors"
                  >
                     <Download size={14} />
                     Скачать
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AssetLibrary;