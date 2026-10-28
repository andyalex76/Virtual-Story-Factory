import React, { useRef, useEffect, useState } from 'react';
import { Message, Role, Asset } from '../types';
import { Send, Bot, PenTool, Search, Sparkles, User, Paperclip, X, FileText, Image as ImageIcon, Palette } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export interface ActionButton {
  label: string;
  message: string;
  type: 'primary' | 'secondary' | 'danger';
  icon?: React.ElementType;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, attachments: Asset[]) => void;
  isProcessing: boolean;
  activeAgent: Role | null;
  suggestedActions: ActionButton[];
  placeholderText?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isProcessing, activeAgent, suggestedActions, placeholderText }) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Asset[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSend = () => {
      if ((!inputText.trim() && attachments.length === 0) || isProcessing) return;
      onSendMessage(inputText, attachments);
      setInputText('');
      setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newAssets: Asset[] = [];
        const files = Array.from(e.target.files);

        for (const file of files) {
            // Explicitly cast file to File because Array.from might return unknown[] depending on TS config
            const fileObj = file as File;
            try {
                const asset = await readFileAsAsset(fileObj);
                newAssets.push(asset);
            } catch (err) {
                console.error("Error reading file", fileObj.name, err);
            }
        }
        setAttachments(prev => [...prev, ...newAssets]);
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const readFileAsAsset = (file: File): Promise<Asset> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          // Determine generic type
          const isImage = file.type.startsWith('image/');
          const isPdf = file.type === 'application/pdf';
          const isText = file.type.startsWith('text/') || 
                         file.name.endsWith('.md') || 
                         file.name.endsWith('.json') || 
                         file.name.endsWith('.js') || 
                         file.name.endsWith('.ts');

          reader.onload = () => {
              const result = reader.result as string;
              
              const asset: Asset = {
                  id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  name: file.name,
                  category: 'reference', // Default for uploads
                  type: isImage ? 'image' : isPdf ? 'pdf' : 'text',
              };

              if (isImage) {
                  asset.url = result; // Base64 for images
              } else if (isText) {
                  asset.content = result; // Text content
              } else {
                  // Fallback for binaries/PDFs (without a parser lib, we treat as generic ref)
                  asset.content = `[File: ${file.name} uploaded. Content parsing not available in browser-only mode without extensions.]`;
              }
              resolve(asset);
          };

          reader.onerror = reject;

          if (isImage) {
              reader.readAsDataURL(file);
          } else {
              // Try to read everything else as text first to catch code/md/txt
              // For actual PDF binaries, readAsText yields garbage, but we handle the UI type logic above.
              reader.readAsText(file); 
          }
      });
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          // Don't show technical commands in chat if possible, or style them differently
          const isCommand = isUser && (msg.content.includes('_') || msg.content === msg.content.toUpperCase()) && !msg.content.includes(' ');
          
          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                  msg.role === 'editor' ? 'bg-sky-700 text-white' : 
                  msg.role === 'writer' ? 'bg-emerald-700 text-white' :
                  msg.role === 'reader' ? 'bg-orange-700 text-white' : 
                  msg.role === 'designer' ? 'bg-purple-700 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                  {msg.role === 'editor' && <Bot size={16} />}
                  {msg.role === 'writer' && <PenTool size={16} />}
                  {msg.role === 'reader' && <Search size={16} />}
                  {msg.role === 'designer' && <Palette size={16} />}
                  {msg.role === 'user' && <User size={16} />}
              </div>
              
              <div className="max-w-[80%] space-y-2">
                  <div className={`rounded-lg p-3 text-sm ${
                      isCommand ? 'bg-slate-800/50 text-slate-500 font-mono text-xs border border-slate-800' :
                      isUser ? 'bg-sky-900/40 text-sky-100 border border-sky-800/50' : 
                      'bg-slate-900 border border-slate-800 text-slate-300'
                  }`}>
                      <MarkdownRenderer content={msg.content} />
                  </div>
                  
                  {/* Display Attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {msg.attachments.map(att => (
                              <div key={att.id} className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded text-xs text-slate-400 border border-slate-700">
                                  {att.type === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />}
                                  <span className="truncate max-w-[150px]">{att.name}</span>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
            </div>
          );
        })}
        
        {isProcessing && (
           <div className="flex gap-3">
               <div className="w-8 h-8 rounded bg-slate-800 animate-pulse" />
               <div className="bg-slate-800/50 text-slate-500 text-xs px-3 py-2 rounded flex items-center gap-2">
                   <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                   {activeAgent?.toUpperCase()} РАБОТАЕТ...
               </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Control Panel Area */}
      <div className="bg-slate-900 border-t border-slate-800 p-4">
        {/* Strict Controls */}
        {suggestedActions.length > 0 && !isProcessing && !inputText && (
            <div className="flex flex-wrap gap-2 justify-center mb-4">
                {suggestedActions.map((action, idx) => {
                    const Icon = action.icon || Sparkles;
                    return (
                        <button
                            key={idx}
                            onClick={() => {
                                onSendMessage(action.message, attachments);
                                setAttachments([]);
                            }}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded text-xs font-bold uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-lg
                                ${action.type === 'primary' 
                                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/20' 
                                    : action.type === 'danger'
                                        ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-rose-900/20'
                                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                                }
                            `}
                        >
                            <Icon size={14} />
                            {action.label}
                        </button>
                    );
                })}
            </div>
        )}

        {/* Attachment Preview */}
        {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2 px-1">
                {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 bg-slate-800 pl-2 pr-1 py-1 rounded-md border border-slate-700 group shrink-0">
                        <span className="text-xs text-sky-400 font-bold flex items-center gap-1">
                            {att.type === 'image' ? <ImageIcon size={10} /> : <FileText size={10} />}
                            {att.name}
                        </span>
                        <button onClick={() => removeAttachment(att.id)} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white">
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* Manual Override Input */}
        <div className="relative max-w-3xl mx-auto flex gap-2 items-end">
            <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect}
                accept=".txt,.md,.json,.js,.pdf,.png,.jpg,.jpeg"
            />
            
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-800 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-700 border border-slate-700 transition-colors h-[46px]"
                title="Прикрепить файлы (референсы, контекст)"
                disabled={isProcessing}
            >
                <Paperclip size={18} />
            </button>

            <div className="relative flex-1">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholderText}
                    disabled={isProcessing}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-sky-600 disabled:opacity-50 resize-none"
                />
                <button 
                    onClick={handleSend}
                    disabled={isProcessing || (!inputText.trim() && attachments.length === 0)}
                    className="absolute right-2 bottom-3 p-1.5 bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-0 transition-all"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;