import React, { useState, useEffect, useRef, useCallback } from 'react';
import ProgressBar from './components/ProgressBar';
import AssetLibrary from './components/AssetLibrary';
import ChatInterface, { ActionButton } from './components/ChatInterface';
import ReaderView from './components/ReaderView';
import { AppState, Stage, Role, Message, Asset, Toast } from './types';
import { generateAgentResponse, generateStructuredCritique } from './services/geminiService';
import { Check, ArrowRight, Sparkles, RefreshCw, PenTool, Search, Download, Info, Archive, Share2, CheckCircle2, Upload, Play, RotateCcw, List } from 'lucide-react';

// --- CONSTANTS ---
const STORAGE_KEY = 'VSF_APP_STATE_V2';
const BACKUP_REMINDER_MSG = "Рекомендуем сохранить резервную копию проекта (JSON)";

// Command Constants for safer logic comparison
const CMDS = {
  // General
  NEW_PROJECT: 'CMD_NEW_PROJECT',
  IMPORT_CONTINUE: 'CMD_IMPORT_CONTINUE',
  START_FROM_SCRATCH: 'CMD_START_FROM_SCRATCH',
  
  // Brief Stage
  APPROVE_BIBLE: 'CMD_APPROVE_BIBLE',
  REFINE_OUTLINE: 'CMD_REFINE_OUTLINE',
  
  // Writing Stage
  GENERATE_DRAFT: 'CMD_GENERATE_DRAFT',
  
  // Critique Stage
  APPROVE_CHAPTER: 'CMD_APPROVE_CHAPTER',
  FINISH_STORY: 'CMD_FINISH_STORY',
  APPLY_CRITIQUE: 'CMD_APPLY_CRITIQUE',
  
  // Release Stage
  COMPILE_MANUSCRIPT: 'CMD_COMPILE_MANUSCRIPT',
  GENERATE_MARKETING: 'CMD_GENERATE_MARKETING',
};

// --- FACTORY FOR CLEAN STATE ---
const getInitialState = (): AppState => ({
  stage: Stage.INIT,
  messages: [{
    id: `init-${Date.now()}`,
    role: 'editor',
    content: "Добро пожаловать в **Virtual Story Factory**. \n\nВыберите режим работы:\n\n**Режим 1: Создание с нуля**\nНажмите «Начать новую книгу», чтобы алгоритм разработал концепцию, Story Bible и начал писать книгу с первой главы.\n\n**Режим 2: Продолжение работы**\nПрикрепите файл `Final_Story_Bible.md` и готовые главы (например, `Chapter_1_Final.md`), затем нажмите «Продолжить книгу». Алгоритм проанализирует их и продолжит написание следующих глав.",
    timestamp: Date.now()
  }],
  assets: [],
  story: {
    title: "Новый проект",
    concept: "",
    targetAudience: "General",
    styleTone: "Neutral",
    outline: [],
    currentChapterIndex: 0,
    chapters: []
  },
  isProcessing: false,
  activeAgent: null,
  toasts: [],
  tokenUsage: { input: 0, output: 0, total: 0 }
});

function App() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { 
            ...getInitialState(), 
            ...parsed, 
            isProcessing: false, 
            activeAgent: null, 
            toasts: [],
            tokenUsage: parsed.tokenUsage || { input: 0, output: 0, total: 0 }
        };
      }
    } catch (e) { console.error(e); }
    return getInitialState();
  });

  const [viewMode, setViewMode] = useState<'chat' | 'read'>('chat');
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [projectLoadProgress, setProjectLoadProgress] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void, onCancel?: () => void } | null>(null);
  const projectLoaderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.story.currentChapterIndex !== undefined) {
        setSelectedChapterIndex(state.story.currentChapterIndex);
    }
  }, [state.story.currentChapterIndex]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
        const { isProcessing, activeAgent, toasts, ...persistent } = state;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistent));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [state]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setState(prev => ({ ...prev, toasts: [...prev.toasts, { id, message, type }] }));
    setTimeout(() => setState(prev => ({ ...prev, toasts: prev.toasts.filter(t => t.id !== id) })), 5000);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        addToast(BACKUP_REMINDER_MSG, "info");
    }, 30 * 60 * 1000); 
    return () => clearInterval(interval);
  }, [addToast]);

  const createSystemAsset = (name: string, content: string, category: Asset['category']): Asset => ({
    id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type: 'text', name, content, category
  });

  const handleSaveProject = () => {
    try {
      const projectData = { ...state, isProcessing: false, activeAgent: null, toasts: [] };
      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeTitle = state.story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `VSF_${safeTitle}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast("Проект успешно сохранен на диск.", "success");
    } catch (e) {
      addToast("Ошибка при сохранении файла.", "error");
    }
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      
      setIsProjectLoading(true);
      setProjectLoadProgress(0);

      const reader = new FileReader();

      reader.onprogress = (event) => {
          if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setProjectLoadProgress(progress);
          }
      };

      reader.onload = (event) => {
          try {
              const jsonContent = event.target?.result as string;
              const loadedState = JSON.parse(jsonContent);
              setConfirmDialog({
                  message: `Загрузить проект "${loadedState.story.title || 'Без названия'}"?`,
                  onConfirm: () => {
                       setState({
                           ...getInitialState(), 
                           ...loadedState,   
                           isProcessing: false,
                           activeAgent: null,
                           toasts: [{ id: `load-${Date.now()}`, message: 'Проект успешно загружен.', type: 'success' }]
                       });
                       setConfirmDialog(null);
                  },
                  onCancel: () => {
                       addToast("Загрузка отменена.", "info");
                       setConfirmDialog(null);
                  }
              });
          } catch (err) {
              addToast("Ошибка: Неверный формат файла проекта.", "error");
          } finally {
              setIsProjectLoading(false);
              setProjectLoadProgress(0);
          }
      };

      reader.onerror = () => {
          addToast("Ошибка при чтении файла.", "error");
          setIsProjectLoading(false);
          setProjectLoadProgress(0);
      };

      reader.readAsText(file);
  };

  const handleRestoreAsset = (asset: Asset) => {
      const match = asset.name.match(/Chapter_(\d+)/i);
      if (!match) return;

      const chapterNum = parseInt(match[1], 10);
      const chapterIndex = chapterNum - 1;

      setConfirmDialog({
          message: `Вы уверены, что хотите откатиться к версии "${asset.name}"? Весь прогресс после этой главы будет удален.`,
          onConfirm: () => {
              setState(prev => {
                  const newStory = { ...prev.story };
                  newStory.chapters = newStory.chapters.slice(0, chapterIndex + 1);
                  
                  if (!newStory.chapters[chapterIndex]) {
                      newStory.chapters[chapterIndex] = { id: `ch-${Date.now()}`, title: `Глава ${chapterNum}`, content: asset.content || "", status: 'review' };
                  } else {
                      newStory.chapters[chapterIndex].content = asset.content || "";
                      newStory.chapters[chapterIndex].status = 'review';
                      newStory.chapters[chapterIndex].feedback = '';
                  }

                  newStory.currentChapterIndex = chapterIndex;

                  return {
                      ...prev,
                      story: newStory,
                      stage: Stage.CRITIQUE,
                      messages: [
                          ...prev.messages, 
                          { id: `sys-restore-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, role: 'editor', content: `⏪ **Откат системы:** Проект возвращен к состоянию "${asset.name}". Вы можете отредактировать главу или утвердить её заново.`, timestamp: Date.now() }
                      ]
                  };
              });
              setConfirmDialog(null);
              addToast(`Проект откачен к ${asset.name}`, "success");
          },
          onCancel: () => setConfirmDialog(null)
      });
  };

  const handleReset = () => {
    const hasProgress = state.messages.length > 1 || state.assets.length > 0 || state.story.chapters.length > 0;
    const confirmationMsg = "Вы уверены, что хотите начать заново? Весь текущий прогресс будет стерт.";
    
    const performReset = () => {
        localStorage.removeItem(STORAGE_KEY);
        setState(getInitialState());
        setViewMode('chat');
        setSelectedChapterIndex(0);
        addToast("Проект полностью удален.", "success");
        setConfirmDialog(null);
    };

    if (!hasProgress) {
        performReset();
    } else {
        setConfirmDialog({
            message: confirmationMsg,
            onConfirm: performReset,
            onCancel: () => setConfirmDialog(null)
        });
    }
  };

  const getStageControls = (): ActionButton[] => {
    if (state.isProcessing) return [];
    switch (state.stage) {
      case Stage.INIT:
        return [
          { label: 'Начать новую книгу', message: CMDS.START_FROM_SCRATCH, type: 'primary', icon: Sparkles },
          { label: 'Продолжить книгу', message: CMDS.IMPORT_CONTINUE, type: 'secondary', icon: Upload },
        ];
      case Stage.BRIEF:
        return [
          { label: 'Утвердить Story Bible', message: CMDS.APPROVE_BIBLE, type: 'primary', icon: Check },
          { label: 'Доработать структуру', message: CMDS.REFINE_OUTLINE, type: 'secondary', icon: List },
        ];
      case Stage.WRITING:
        return [ { label: 'Написать главу', message: CMDS.GENERATE_DRAFT, type: 'primary', icon: PenTool } ];
      case Stage.CRITIQUE:
        return [
          { label: 'Принять правки', message: CMDS.APPLY_CRITIQUE, type: 'secondary', icon: RefreshCw },
          { label: 'Утвердить и дальше', message: CMDS.APPROVE_CHAPTER, type: 'primary', icon: ArrowRight },
          { label: 'Завершить книгу', message: CMDS.FINISH_STORY, type: 'primary', icon: CheckCircle2 },
        ];
      case Stage.RELEASE:
        return [
            { label: 'Скомпилировать книгу', message: CMDS.COMPILE_MANUSCRIPT, type: 'primary', icon: Archive },
            { label: 'Маркетинговые материалы', message: CMDS.GENERATE_MARKETING, type: 'secondary', icon: Share2 }
        ];
      default: return [];
    }
  };

  const getPlaceholder = () => {
      if (state.isProcessing) return "ИИ работает...";
      if (state.stage === Stage.INIT) return "Опишите идею или прикрепите файлы для продолжения...";
      return "Введите сообщение...";
  };

  const processCommand = async (text: string, newAssets: Asset[] = []) => {
    if (text === CMDS.NEW_PROJECT) { handleReset(); return; }
    
    let displayContent = text;
    let actualPrompt = text;
    let importDetected = false;

    // --- CONTINUATION MODE LOGIC ---
    if (text === CMDS.IMPORT_CONTINUE) {
        const bible = newAssets.find(a => a.name.toLowerCase().includes('story_bible'));
        const chaptersFound = newAssets.filter(a => a.name.toLowerCase().match(/(?:chapter|глава)_(\d+)_final/));

        if (!bible) {
            addToast("Ошибка: Прикрепите Final_Story_Bible.md", "error");
            return;
        }
        
        displayContent = `🚀 **Режим продолжения активирован**\nЗагружена Story Bible и ${chaptersFound.length} глав.`;
        importDetected = true;
    }

    if (text === CMDS.APPROVE_BIBLE) displayContent = "✅ **Story Bible утверждена**";
    else if (text === CMDS.GENERATE_DRAFT) displayContent = "✍️ **Команда: Начать написание главы**";
    else if (text === CMDS.APPROVE_CHAPTER) displayContent = "✅ **Глава утверждена. Переход к следующей.**";
    else if (text === CMDS.FINISH_STORY) displayContent = "🏁 **Книга завершена. Переход к релизу.**";
    else if (text === CMDS.START_FROM_SCRATCH) displayContent = "✨ **Команда: Начать новую книгу**";
    else if (text === CMDS.APPLY_CRITIQUE) displayContent = "🔄 **Команда: Принять правки и переписать**";
    else if (text === CMDS.COMPILE_MANUSCRIPT) displayContent = "📚 **Команда: Скомпилировать книгу**";

    const userMsg: Message = { id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, role: 'user', content: displayContent, timestamp: Date.now(), attachments: newAssets };
    
    // Categorize imported assets correctly
    const processedAssets = newAssets.map(a => {
        if (a.name.toLowerCase().includes('story_bible')) return { ...a, category: 'lore' as const };
        if (a.name.toLowerCase().includes('_final')) return { ...a, category: 'output' as const };
        return a;
    });

    const contextAssets = [...state.assets, ...processedAssets];
    setState(prev => ({ ...prev, messages: [...prev.messages, userMsg], assets: contextAssets, isProcessing: true, activeAgent: 'editor' }));

    try {
        let nextStage = state.stage;
        let nextStory = { ...state.story };
        let responseText = "";
        let newSysAssets: Asset[] = [];
        let actingAgent: Role = 'editor';
        let currentUsage = { input: 0, output: 0 };

        const updateUsage = (u: { input: number, output: number }) => {
            currentUsage.input += u.input;
            currentUsage.output += u.output;
        };

        const runWriterAndCritic = async (chapterNum: number, prompt: string, assets: Asset[]) => {
            // 1. Writer generates draft
            setState(prev => ({ ...prev, activeAgent: 'writer' }));
            const resWriter = await generateAgentResponse('writer', nextStory, prompt, assets, Stage.WRITING);
            updateUsage(resWriter.usage);
            
            if (!nextStory.chapters[nextStory.currentChapterIndex]) {
                nextStory.chapters[nextStory.currentChapterIndex] = { id: `ch-${Date.now()}`, title: `Глава ${chapterNum}`, content: resWriter.text, status: 'draft' };
            } else {
                nextStory.chapters[nextStory.currentChapterIndex].content = resWriter.text;
                nextStory.chapters[nextStory.currentChapterIndex].status = 'draft';
            }
            
            const writerMsg: Message = { id: `writer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, role: 'writer', content: resWriter.text, timestamp: Date.now() };
            setState(prev => ({
                ...prev,
                story: nextStory,
                messages: [...prev.messages, writerMsg],
                activeAgent: 'reader'
            }));

            // 2. Reader critiques draft
            const resReader = await generateStructuredCritique(resWriter.text, nextStory.targetAudience, nextStory.chapters[nextStory.currentChapterIndex].feedback);
            updateUsage(resReader.usage);
            
            nextStory.chapters[nextStory.currentChapterIndex].status = 'review';
            nextStory.chapters[nextStory.currentChapterIndex].feedback = resReader.text;
            
            nextStage = Stage.CRITIQUE;
            actingAgent = 'reader';
            responseText = resReader.text;
        };

        // --- STAGE LOGIC ---
        if (importDetected) {
            const bible = processedAssets.find(a => a.category === 'lore');
            const chapterAssets = processedAssets
                .filter(a => a.category === 'output' && a.name.toLowerCase().match(/(?:chapter|глава)_(\d+)_final/))
                .map(a => {
                    const match = a.name.match(/(\d+)/);
                    return { num: parseInt(match![0]), asset: a };
                })
                .sort((a, b) => a.num - b.num);

            const chapters: any[] = chapterAssets.map(c => ({
                id: c.asset.id,
                title: `Глава ${c.num}`,
                content: c.asset.content || "",
                status: 'final'
            }));

            const titleMatch = bible?.content?.match(/TITLE:\s*(.+?)(\n|$)/i);
            nextStory = {
                ...nextStory,
                title: titleMatch ? titleMatch[1].trim() : "Продолжение проекта",
                concept: bible?.content || "",
                chapters: chapters,
                currentChapterIndex: chapters.length
            };
            nextStage = Stage.WRITING;

            // Editor explains the situation
            responseText = `Данные успешно импортированы. Я вижу **${chapters.length}** завершенных глав и утвержденный план. \n\n**Писатель**, на основе Story Bible приступай к написанию **Главы ${chapters.length + 1}**.`;
            
            // Immediate transition to Writer
            setState(prev => ({ ...prev, story: nextStory, stage: nextStage, activeAgent: 'writer', messages: [...prev.messages, { id: `sys-imp-${Date.now()}`, role: 'editor', content: responseText, timestamp: Date.now() }] }));
            
            const lastChapterContent = chapters.length > 0 ? chapters[chapters.length - 1].content : "";
            const bridge = lastChapterContent.length > 5000 ? lastChapterContent.slice(-5000) : lastChapterContent;
            
            const writerPrompt = `
                ЗАДАЧА: Написать Главу ${chapters.length + 1}.
                КОНТЕКСТ: Продолжение существующего проекта.
                КОНЕЦ ПРЕДЫДУЩЕЙ ГЛАВЫ:
                """
                ${bridge}
                """
                Пожалуйста, следуй тону и стилю, заданным в Story Bible и предыдущих главах.
            `;
            
            const res = await generateAgentResponse('writer', nextStory, writerPrompt, contextAssets, Stage.WRITING);
            responseText = res.text;
            updateUsage(res.usage);
            actingAgent = 'writer';
            
            nextStory.chapters.push({ id: `ch-${Date.now()}`, title: `Глава ${nextStory.currentChapterIndex + 1}`, content: responseText, status: 'draft' });
            newSysAssets.push(createSystemAsset(`Chapter_${nextStory.currentChapterIndex+1}_Draft.md`, responseText, 'output'));

        } else if (state.stage === Stage.INIT) {
            const promptToUse = text === CMDS.START_FROM_SCRATCH 
                ? "Создай концепцию для новой книги. Предложи 3 варианта жанра и сеттинга на выбор." 
                : actualPrompt;
            const res = await generateAgentResponse('editor', nextStory, promptToUse, contextAssets, Stage.BRIEF);
            responseText = res.text;
            updateUsage(res.usage);
            if (responseText.includes("# STORY BIBLE") || text === CMDS.START_FROM_SCRATCH) {
                nextStage = Stage.BRIEF;
                const titleMatch = responseText.match(/TITLE:\s*(.+?)(\n|$)/i);
                if (titleMatch) nextStory.title = titleMatch[1].trim().replace(/['"]/g, '');
            }
        }
        else if (state.stage === Stage.BRIEF) {
            if (text === CMDS.APPROVE_BIBLE) {
                nextStage = Stage.WRITING;
                actingAgent = 'writer';
                const lastBibleMsg = [...state.messages].reverse().find(m => m.role === 'editor' && m.content.includes("# STORY BIBLE"));
                const bibleContent = lastBibleMsg ? lastBibleMsg.content : "# Story Bible";
                newSysAssets.push(createSystemAsset('Final_Story_Bible.md', bibleContent, 'lore'));
                setState(prev => ({ ...prev, activeAgent: 'writer' }));
                const res = await generateAgentResponse('writer', nextStory, "Начни Главу 1", [...contextAssets, ...newSysAssets], Stage.WRITING);
                responseText = res.text;
                updateUsage(res.usage);
                nextStory.chapters = [{ id: `ch-1`, title: `Глава 1`, content: responseText, status: 'draft' }];
                nextStory.currentChapterIndex = 0;
            } else {
                const res = await generateAgentResponse('editor', nextStory, actualPrompt, contextAssets, Stage.BRIEF);
                responseText = res.text;
                updateUsage(res.usage);
            }
        }
        else if (state.stage === Stage.WRITING) {
            if (text === CMDS.GENERATE_DRAFT) {
                const chapterNum = nextStory.currentChapterIndex + 1;
                const prompt = `Напиши Главу ${chapterNum}. Сверься со Story Bible.`;
                await runWriterAndCritic(chapterNum, prompt, contextAssets);
            } else {
                actingAgent = 'writer';
                const res = await generateAgentResponse('writer', nextStory, actualPrompt, contextAssets, Stage.WRITING);
                responseText = res.text;
                updateUsage(res.usage);
                if (nextStory.chapters[nextStory.currentChapterIndex]) nextStory.chapters[nextStory.currentChapterIndex].content = responseText;
            }
        }
        else if (state.stage === Stage.CRITIQUE) {
            if (text === CMDS.APPROVE_CHAPTER) {
                const finishedIdx = nextStory.currentChapterIndex;
                const finalContent = nextStory.chapters[finishedIdx].content;
                nextStory.chapters[finishedIdx].status = 'final';
                newSysAssets.push(createSystemAsset(`Chapter_${finishedIdx+1}_Final.md`, finalContent, 'output'));
                
                nextStory.currentChapterIndex++;
                addToast(`Глава ${finishedIdx + 1} завершена.`, "success");
                
                const chapterNum = nextStory.currentChapterIndex + 1;
                const prompt = `Напиши Главу ${chapterNum}. Сверься со Story Bible.`;
                await runWriterAndCritic(chapterNum, prompt, [...contextAssets, ...newSysAssets]);
            } else if (text === CMDS.FINISH_STORY) {
                nextStage = Stage.RELEASE;
                responseText = "Книга завершена. Готово к релизу.";
            } else if (text === CMDS.APPLY_CRITIQUE) {
                const chapterNum = nextStory.currentChapterIndex + 1;
                const prompt = `Перепиши Главу ${chapterNum} с учетом замечаний критика.`;
                await runWriterAndCritic(chapterNum, prompt, contextAssets);
            } else {
                actingAgent = 'editor';
                const res = await generateAgentResponse('editor', nextStory, actualPrompt, contextAssets, Stage.CRITIQUE);
                responseText = res.text;
                updateUsage(res.usage);
            }
        }
        else if (state.stage === Stage.RELEASE) {
            if (text === CMDS.GENERATE_MARKETING) {
                actingAgent = 'designer';
                const res = await generateAgentResponse('designer', nextStory, actualPrompt, contextAssets, Stage.RELEASE);
                responseText = res.text;
                updateUsage(res.usage);
            } else if (text === CMDS.COMPILE_MANUSCRIPT) {
                actingAgent = 'editor';
                
                // Collect all final chapters from assets to ensure we get the exact saved versions
                const finalChapterAssets = contextAssets
                    .filter(a => a.category === 'output' && a.name.match(/Chapter_(\d+)_Final\.md/i))
                    .map(a => {
                        const match = a.name.match(/Chapter_(\d+)_Final\.md/i);
                        return { num: parseInt(match![1], 10), content: a.content || "" };
                    })
                    .sort((a, b) => a.num - b.num);

                const compiledText = finalChapterAssets.length > 0 
                    ? finalChapterAssets.map(ch => ch.content).join('\n\n---\n\n')
                    : nextStory.chapters.filter(ch => ch.status === 'final').map(ch => ch.content).join('\n\n---\n\n');

                const bookName = nextStory.title ? nextStory.title.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '').trim().replace(/\s+/g, '_') : 'Book';
                const fileName = `${bookName}.md`;
                
                newSysAssets.push(createSystemAsset(fileName, compiledText, 'output'));
                responseText = `✅ **Книга скомпилирована и сохранена.**\nФайл \`${fileName}\` добавлен в Память проекта (раздел ВЫВОД).`;
            } else {
                const res = await generateAgentResponse('editor', nextStory, actualPrompt, contextAssets, Stage.RELEASE);
                responseText = res.text;
                updateUsage(res.usage);
            }
        }

        setState(prev => ({
            ...prev,
            stage: nextStage,
            story: nextStory,
            messages: [...prev.messages, { id: `resp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, role: actingAgent, content: responseText, timestamp: Date.now() }],
            assets: [...prev.assets, ...newSysAssets],
            isProcessing: false,
            activeAgent: null,
            tokenUsage: {
                input: prev.tokenUsage.input + currentUsage.input,
                output: prev.tokenUsage.output + currentUsage.output,
                total: prev.tokenUsage.total + currentUsage.input + currentUsage.output
            }
        }));

    } catch (err) {
        addToast("Ошибка API", "error");
        setState(prev => ({ ...prev, isProcessing: false, activeAgent: null }));
    }
  };

  return (
    <div className="flex w-full h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
        <ProgressBar currentStage={state.stage} activeAgent={state.activeAgent} tokenUsage={state.tokenUsage} />
        <main className="flex-1 flex flex-col min-w-0 relative">
            {confirmDialog && (
                <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl w-96 flex flex-col items-center text-center">
                        <Info className="text-sky-400 mb-4" size={32} />
                        <h3 className="text-white font-bold mb-6">{confirmDialog.message}</h3>
                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={confirmDialog.onCancel}
                                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-sm transition-colors"
                            >
                                Отмена
                            </button>
                            <button 
                                onClick={confirmDialog.onConfirm}
                                className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-sky-900/20"
                            >
                                Подтвердить
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isProjectLoading && (
                <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl w-80 flex flex-col items-center">
                        <Upload className="text-sky-400 mb-4 animate-bounce" size={32} />
                        <h3 className="text-white font-bold mb-2">Загрузка проекта...</h3>
                        <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
                            <div className="bg-sky-500 h-2 rounded-full transition-all duration-300" style={{ width: `${projectLoadProgress}%` }}></div>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{projectLoadProgress}%</span>
                    </div>
                </div>
            )}
            <header className="h-14 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-white tracking-tight">{state.story.title}</span>
                    <div className="h-4 w-px bg-slate-700" />
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{state.stage}</span>
                    <div className="flex items-center gap-2 ml-4">
                        <button onClick={handleSaveProject} className="p-1.5 text-slate-400 hover:text-sky-400 rounded"><Download size={16} /></button>
                        <button onClick={() => projectLoaderRef.current?.click()} className="p-1.5 text-slate-400 hover:text-emerald-400 rounded"><Upload size={16} /></button>
                        <button onClick={handleReset} className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-[10px] uppercase font-bold ml-2 transition-all shadow-sm"><RotateCcw size={12} /><span>Начать заново</span></button>
                        <input type="file" ref={projectLoaderRef} className="hidden" accept=".json" onChange={handleLoadProject} />
                    </div>
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button onClick={() => setViewMode('chat')} className={`px-4 py-1 rounded text-xs font-bold ${viewMode === 'chat' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400'}`}>КОМАНДНЫЙ ЦЕНТР</button>
                    <button onClick={() => setViewMode('read')} className={`px-4 py-1 rounded text-xs font-bold ${viewMode === 'read' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>ЧИТАТЕЛЬСКИЙ ЗАЛ</button>
                </div>
            </header>
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'chat' ? (
                    <ChatInterface messages={state.messages} onSendMessage={processCommand} isProcessing={state.isProcessing} activeAgent={state.activeAgent} suggestedActions={getStageControls()} placeholderText={getPlaceholder()} />
                ) : (
                    <ReaderView story={state.story} selectedIndex={selectedChapterIndex} onSelectChapter={setSelectedChapterIndex} />
                )}
            </div>
            <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2">
                 {state.toasts.map(t => (
                     <div key={t.id} className="bg-slate-900/90 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom">
                         <Info size={16} className="text-sky-400" /> <span className="text-sm">{t.message}</span>
                     </div>
                 ))}
            </div>
        </main>
        <AssetLibrary assets={state.assets} onRestoreAsset={handleRestoreAsset} />
    </div>
  );
}

export default App;