import { GoogleGenAI } from "@google/genai";
import { Role, StoryContext, Asset, Stage } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System Instructions for each Agent
const PERSONAS: Record<string, string> = {
  editor: `Ты — Главный Редактор и Оркестратор издательства «Virtual Story Factory».
  Твоя цель — провести Пользователя через весь процесс создания книги.

  Твои задачи на этапе BRIEF:
  1. Сформировать полную структуру книги.
  2. ВЫВОДИТЬ ИТОГОВЫЙ ПЛАН СТРОГО В ОДНОМ СООБЩЕНИИ, начиная с заголовка "# STORY BIBLE".
  
  СТРУКТУРА STORY BIBLE:
  # STORY BIBLE
  TITLE: [Название проекта]
  LOGLINE: [Краткая суть одним предложением]
  
  ## SETTING
  [Мир, время действия, атмосфера]
  
  ## CHARACTER BIOGRAPHIES
  [Для каждого ключевого персонажа:]
  ### [Имя Персонажа]
  - **Role:** [Роль в истории: Протагонист/Антагонист/Ментор и т.д.]
  - **Description:** [Внешность, возраст, одежда, отличительные черты]
  - **Backstory:** [Краткая предыстория, травмы или события, сформировавшие героя]
  - **Motivation:** [Истинная цель, чего хочет достичь и почему]

  ## CHAPTER PLAN
  [Список глав с кратким содержанием каждой]
  
  Если пользователь просит правок, ты выдаешь ОБНОВЛЕННУЮ ПОЛНУЮ STORY BIBLE с тем же заголовком.
  Не переходи к написанию текста глав, пока пользователь не нажмет кнопку утверждения.
  `,

  writer: `Ты — профессиональный писатель.
  Твоя задача: Написать главу на основе Story Bible.
  ИНСТРУКЦИИ:
  - Соблюдай Тон и Целевую Аудиторию.
  - Пиши сразу текст главы, без вступлений типа "Вот ваша глава".
  - Используй Markdown для оформления.
  - Если это Глава 1, задай темп. Если последующие — развивай сюжет на основе предыдущих событий, переданных в контексте.
  `,

  reader: `Ты — Литературный Критик.
  Проведи глубокий анализ текста главы.
  ФОРМАТ:
  **РЕДАКТОРСКОЕ ЗАКЛЮЧЕНИЕ**
  - Что удалось:
  - Что требует исправления:
  - Оценка стиля и логики (1-10):
  `,

  designer: `Ты — Креативный Дизайнер и Маркетолог.
  Твоя задача: Разработать маркетинговые материалы и визуальные концепции для книги.
  ИНСТРУКЦИИ:
  - Предложи идеи для обложки (описание для художника/Midjourney).
  - Напиши аннотацию (blurb) для задней обложки.
  - Предложи 3 варианта рекламных постов для соцсетей.
  - Опирайся на Story Bible и целевую аудиторию.`
};

interface AgentResponse {
  text: string;
  usage: {
    input: number;
    output: number;
  };
}

/**
 * SMART CONTEXT FILTER
 * Optimizes token usage by filtering out redundant assets.
 * 
 * Strategy:
 * 1. Always keep 'Story Bible' (Critical Context).
 * 2. Keep 'Lore', 'Style', 'Reference' (User inputs).
 * 3. EXCLUDE previous 'Output' chapters from the general context window.
 *    - Why? The App.tsx main logic explicitly injects the "Narrative Bridge" 
 *      (last 5000 chars of prev chapter) into the Prompt string.
 *    - Sending full texts of Chapter 1-5 when writing Chapter 6 wastes tokens 
 *      and distracts the model.
 */
const getRelevantAssets = (assets: Asset[]): Asset[] => {
    return assets.filter(a => {
        // Always allow Story Bible / Logic
        if (a.name.includes('Story_Bible') || a.name.includes('Story Bible')) return true;
        
        // Allow static references (Lore, Style guides, User uploads)
        if (['lore', 'style', 'reference'].includes(a.category)) return true;
        
        // Filter out bulky Chapter outputs (Drafts or Finals)
        // Only the immediate previous context (Bridge) provided in the prompt is needed.
        if (a.category === 'output' && (a.name.startsWith('Chapter_') || a.name.includes('_Draft'))) {
            return false;
        }

        return true;
    });
};

export const generateAgentResponse = async (
  role: Role,
  context: StoryContext,
  userMessage: string,
  assets: Asset[],
  stage: Stage
): Promise<AgentResponse> => {
  // Use Pro for writing prose (Quality), Flash for logic/outlining (Speed/Cost)
  const model = role === 'writer' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  // Apply Smart Filtering
  const optimizedAssets = getRelevantAssets(assets);

  const assetContext = optimizedAssets.map(a => {
    if (!a) return '';
    if (a.content) {
        // Limit individual reference docs to 12k chars to prevent single massive file from eating budget
        return `--- DOCUMENT: ${a.name} ---\n${a.content.substring(0, 12000)}`;
    }
    return `[Asset: ${a.name}]`;
  }).join('\n');

  const storyState = `
    Title: ${context.title}
    Audience: ${context.targetAudience}
    Tone: ${context.styleTone}
    Stage: ${stage}
    Chapters Written: ${context.chapters.length}
    Current Outline: ${context.outline.join(', ')}
  `;

  const fullSystemInstruction = `${PERSONAS[role as string] || PERSONAS.editor}
  
  CONTEXT:
  ${storyState}
  
  AVAILABLE ASSETS (Filtered for relevance):
  ${assetContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: userMessage,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: role === 'writer' ? 0.9 : 0.7, 
      },
    });

    return {
        text: response.text || "Ошибка генерации.",
        usage: {
            input: response.usageMetadata?.promptTokenCount || 0,
            output: response.usageMetadata?.candidatesTokenCount || 0
        }
    };
  } catch (error) {
    console.error(error);
    return { text: "Сбой связи с ИИ.", usage: { input: 0, output: 0 } };
  }
};

export const generateStructuredCritique = async (
    chapterText: string, 
    targetAudience: string = "General",
    previousFeedback?: string
): Promise<AgentResponse> => {
  try {
    let prompt = "";
    
    if (previousFeedback) {
        prompt = `
        ЗАДАЧА: ПРОВЕРКА ИСПРАВЛЕНИЙ (RE-REVIEW).
        
        Автор переписал главу, пытаясь исправить твои прошлые замечания.
        
        ТВОИ ПРОШЛЫЕ ЗАМЕЧАНИЯ:
        """
        ${previousFeedback}
        """
        
        НОВЫЙ ТЕКСТ ГЛАВЫ:
        """
        ${chapterText}
        """
        
        ИНСТРУКЦИЯ:
        1. Сравни новый текст с замечаниями. Исправлены ли ошибки?
        2. Стало ли лучше?
        3. Есть ли новые проблемы?
        
        ФОРМАТ ОТВЕТА:
        **ПОВТОРНОЕ ЗАКЛЮЧЕНИЕ**
        - Статус исправлений: [Исправлено / Частично / Нет]
        - Прогресс: [Комментарий о том, как изменился текст]
        - Оставшиеся (или новые) проблемы:
        - Итоговая оценка (1-10):
        `;
    } else {
        prompt = `Проанализируй текст для аудитории ${targetAudience}:\n\n${chapterText}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Flash is sufficient for critique logic
      contents: prompt,
      config: { systemInstruction: PERSONAS.reader, temperature: 0.3 }
    });
    
    return {
        text: response.text || "Нет ответа от критика.",
        usage: {
            input: response.usageMetadata?.promptTokenCount || 0,
            output: response.usageMetadata?.candidatesTokenCount || 0
        }
    };
  } catch (e) {
    return { text: "Не удалось провести критический анализ.", usage: { input: 0, output: 0 } };
  }
};