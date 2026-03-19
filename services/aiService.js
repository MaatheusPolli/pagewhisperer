export class AIService {
    constructor() {
        this.session = null;
        this.abortController = null;
        this.onDownloadProgress = null;
    }

    _detectAPI() {
        const potentialRoots = [
            { name: 'window.ai.languageModel', get: () => window?.ai?.languageModel },
            { name: 'window.ai.assistant', get: () => window?.ai?.assistant },
            { name: 'window.model', get: () => window?.model },
            { name: 'self.LanguageModel', get: () => self?.LanguageModel },
            { name: 'navigator.ai.languageModel', get: () => navigator?.ai?.languageModel },
            { name: 'window.chrome.ai.languageModel', get: () => window?.chrome?.ai?.languageModel }
        ];

        for (const { name, get } of potentialRoots) {
            try {
                const api = get();
                if (api) {
                    console.log(`API encontrada em ${name}`);
                    
                    // Fallback de Namespace: Garante que o objeto window.ai seja criado
                    if (typeof window !== 'undefined') {
                        if (!window.ai) window.ai = {};
                        // Normalização: Força o mapeamento para window.ai.languageModel
                        window.ai.languageModel = api;
                    }
                    
                    // Também garante em self para compatibilidade em diferentes contextos
                    if (typeof self !== 'undefined' && self !== window) {
                        if (!self.ai) self.ai = {};
                        self.ai.languageModel = api;
                    }
                    
                    return api;
                }
            } catch (e) {
                // Ignora erros durante a detecção
            }
        }
        return null;
    }

    async checkAvailability() {
        const api = this._detectAPI();
        
        if (!api) {
            throw new Error("Prompt API (Gemini Nano) is not available. Check chrome://flags.");
        }
        
        // Parâmetros de Ativação: 'expectedOutputLanguage' ajuda a despertar a API
        const availability = await window.ai.languageModel.availability({ expectedOutputLanguage: 'en' });
        
        if (availability === 'no') {
            throw new Error("AI Model is not supported on this device.");
        }
        return availability; // 'available' or 'after-download'
    }

    async _withRetry(fn, retries = 2) {
        let lastError;
        for (let i = 0; i <= retries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (error.name === 'AbortError') throw error;
                console.warn(`AI attempt ${i + 1} failed:`, error);
                if (i < retries) {
                    await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
                }
            }
        }
        console.error("All AI attempts failed. Using fallback.");
        return "Desculpe, não foi possível processar o conteúdo no momento. Por favor, tente novamente em instantes.";
    }

    async _createSession(systemPrompt) {
        if (this.session) {
            this.session.destroy();
            this.session = null;
        }

        // Parâmetros de Ativação: Adicionando expectedOutputLanguage
        const options = {
            expectedOutputLanguage: 'en'
        };
        
        if (systemPrompt) options.systemPrompt = systemPrompt;
        
        options.monitor = (m) => {
            m.addEventListener('downloadprogress', (e) => {
                if (this.onDownloadProgress) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    this.onDownloadProgress(progress);
                }
            });
        };

        this.session = await window.ai.languageModel.create(options);
        return this.session;
    }

    async summarize(title, text, mode = 'normal') {
        this.abort();
        this.abortController = new AbortController();

        const prompts = {
            technical: `Summarize this technical content for a developer audience. Title: "${title}". Content: ${text}`,
            normal: `Summarize this content clearly and concisely. Title: "${title}". Content: ${text}`,
            eli5: `Explain this content as if talking to a 10-year-old. Title: "${title}". Content: ${text}`,
            actions: `Extract action items and next steps from this content. Title: "${title}". Content: ${text}`
        };

        const systemPrompt = `You are a helpful assistant that summarizes web pages. 
        Always return your response in a clear, structured format. 
        If the user asks for a summary, provide 2-3 paragraphs followed by a "Key Points" list.`;

        return this._withRetry(async () => {
            const session = await this._createSession(systemPrompt);
            const prompt = prompts[mode] || prompts.normal;
            return await session.promptStreaming(prompt, {
                signal: this.abortController.signal
            });
        });
    }

    async answerQuestion(pageText, question) {
        this.abort();
        this.abortController = new AbortController();

        return this._withRetry(async () => {
            const session = await this._createSession();
            const prompt = `Context: ${pageText.slice(0, 5000)}\n\nQuestion: ${question}\n\nAnswer based ONLY on the context above. If the answer is not in the context, say you don't know.`;
            
            return await session.promptStreaming(prompt, {
                signal: this.abortController.signal
            });
        });
    }

    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    setDownloadProgressCallback(callback) {
        this.onDownloadProgress = callback;
    }
}
