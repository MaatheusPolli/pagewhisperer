import test from 'node:test';
import assert from 'node:assert';
import { AIService } from '../services/aiService.js';
import { TranslationService } from '../services/translationService.js';
import { JSDOM } from 'jsdom';

// Mocks Globais para ambiente de navegador/Chrome
global.self = global;
global.window = global;
global.navigator = {};
global.chrome = {
    runtime: { sendMessage: async () => ({}), onMessage: { addListener: () => {} } },
    tabs: { query: async () => [{ id: 1 }], sendMessage: async () => {} },
    storage: { 
        local: { 
            get: async () => ({ history: [] }), 
            set: async () => {} 
        } 
    },
    sidePanel: { open: () => {} }
};

// --- MÓDULO: AI SERVICE ---
test('AIService - Suite de Testes', async (t) => {
    
    await t.test('checkAvailability - Deve lançar erro se a API não existir', async () => {
        delete global.self.ai;
        const service = new AIService();
        
        await assert.rejects(
            () => service.checkAvailability(),
            { message: /Prompt API \(Gemini Nano\) is not available/ }
        );
    });

    await t.test('checkAvailability - Deve retornar status correto se disponível', async () => {
        global.self.ai = {
            languageModel: { availability: async () => 'available' }
        };
        const service = new AIService();
        const availability = await service.checkAvailability();
        assert.strictEqual(availability, 'available');
    });

    await t.test('summarize - Deve implementar Retry em caso de falha temporária', async () => {
        let attempts = 0;
        const mockStream = (async function* () { yield 'OK'; })();
        
        global.self.ai.languageModel.create = async () => {
            attempts++;
            if (attempts === 1) throw new Error('Temporary failure');
            return {
                promptStreaming: async () => mockStream,
                destroy: () => {}
            };
        };

        const service = new AIService();
        const stream = await service.summarize('T', 'C');
        
        let result = '';
        for await (const chunk of stream) { result += chunk; }
        
        assert.strictEqual(attempts, 2, 'Deveria ter tentado 2 vezes (1 falha + 1 sucesso)');
        assert.strictEqual(result, 'OK');
    });

    await t.test('summarize - Deve retornar fallback neutro após esgotar retries', async () => {
        global.self.ai.languageModel.create = async () => {
            throw new Error('Critical failure');
        };

        const service = new AIService();
        const result = await service.summarize('T', 'C');
        
        assert.strictEqual(typeof result, 'string');
        assert.ok(result.includes('não foi possível processar'), 'Deveria retornar a mensagem de fallback');
    });
});

// --- MÓDULO: TRANSLATION SERVICE ---
test('TranslationService - Suite de Testes', async (t) => {
    
    // Mock para Detector de Idioma
    global.self.ai.languageDetector = {
        capabilities: async () => ({ available: 'readily' }),
        create: async () => ({ 
            detect: async () => [{ detectedLanguage: 'en', confidence: 1 }] 
        })
    };

    await t.test('translate - Deve detectar idioma automaticamente antes de traduzir', async () => {
        let detected = false;
        global.self.ai.languageDetector.create = async () => ({ 
            detect: async () => { 
                detected = true; 
                return [{ detectedLanguage: 'en' }]; 
            } 
        });

        global.self.ai.translator = {
            capabilities: async () => ({ languagePairAvailable: () => 'readily' }),
            create: async () => ({ translate: async () => 'Olá' })
        };
        
        const service = new TranslationService();
        await service.translate('Hello', 'pt');
        
        assert.strictEqual(detected, true, 'Deveria ter chamado o detector de idioma');
    });

    await t.test('translate - Não deve traduzir se o idioma de origem for igual ao destino', async () => {
        global.self.ai.languageDetector.create = async () => ({ 
            detect: async () => [{ detectedLanguage: 'pt' }] 
        });
        
        const service = new TranslationService();
        const result = await service.translate('Olá mundo', 'pt');
        
        assert.strictEqual(result, 'Olá mundo', 'Não deveria processar tradução para o mesmo idioma');
    });
});

// --- MÓDULO: CONTENT SCRIPT (Extração Inteligente) ---
test('Content Script - Extração Inteligente', async (t) => {
    
    const dom = new JSDOM(`
        <html>
            <head><title>Teste</title></head>
            <body>
                <nav>Ignorar</nav>
                <main>
                    <article>
                        <h1>Título Real</h1>
                        <p>Este é um parágrafo longo o suficiente para ser considerado conteúdo relevante e não deve ser ignorado pela lógica de score.</p>
                        <p>Outro parágrafo importante que adiciona densidade de texto ao artigo principal.</p>
                    </article>
                    <aside>Propaganda Lateral</aside>
                </main>
                <footer>Rodapé</footer>
            </body>
        </html>
    `);
    
    global.document = dom.window.document;
    global.location = { href: 'https://example.com' };

    await t.test('Extração - Deve priorizar artigo e ignorar ruído', () => {
        // Simulação da lógica de extração
        const noiseSelectors = ['nav', 'footer', 'aside'];
        const doc = global.document.cloneNode(true);
        noiseSelectors.forEach(s => doc.querySelectorAll(s).forEach(el => el.remove()));
        
        const text = doc.body.textContent.toLowerCase();
        assert.ok(text.includes('conteúdo relevante'), 'Deveria conter o texto do parágrafo');
        assert.ok(!text.includes('ignorar'), 'Não deveria conter o texto do menu');
        assert.ok(!text.includes('propaganda'), 'Não deveria conter o texto da sidebar');
    });
});
