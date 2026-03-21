import { AIService } from '../services/aiService.js';
import { TranslationService } from '../services/translationService.js';

const aiService = new AIService();
const translationService = new TranslationService();

// UI Elements
const elements = {
    summarizeBtn: document.getElementById('summarize-btn'),
    resetBtn: document.getElementById('reset-btn'),
    translateToggle: document.getElementById('translate-toggle'),
    copyBtn: document.getElementById('copy-btn'),
    exportBtn: document.getElementById('export-btn'),
    qaBtn: document.getElementById('qa-btn'),
    qaInput: document.getElementById('qa-input'),
    
    welcomeScreen: document.getElementById('welcome-screen'),
    loadingScreen: document.getElementById('loading-screen'),
    resultScreen: document.getElementById('result-screen'),
    errorScreen: document.getElementById('error-screen'),
    
    summaryOutput: document.getElementById('summary-output'),
    qaOutput: document.getElementById('qa-output'),
    loadingText: document.getElementById('loading-text'),
    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    errorMessage: document.getElementById('error-message'),
    statusDot: document.getElementById('status-dot'),
    
    modeBtns: document.querySelectorAll('.mode-btn'),
    historySection: document.getElementById('history-section'),
    historyList: document.getElementById('history-list')
};

let currentPageContent = null;
let currentSummary = '';
let currentMode = 'normal';

// --- Helpers ---

/**
 * Secure Markdown-to-HTML formatter with XSS protection
 */
function formatMarkdown(text) {
    // 1. Escape HTML entities to prevent XSS
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // 2. Apply formatting to the escaped text
    return escaped
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/gim, '<br>');
}

/**
 * Estimate time saved (200 wpm)
 */
function calculateTimeSaved(originalText, summaryText) {
    const originalWords = originalText.trim().split(/\s+/).length;
    const summaryWords = summaryText.trim().split(/\s+/).length;
    const minutesSaved = Math.max(1, Math.round((originalWords - summaryWords) / 200));
    return minutesSaved;
}

// --- Logic ---

async function init() {
    try {
        const availability = await aiService.checkAvailability();
        elements.statusDot.classList.add('ready');
        
        if (availability === 'after-download') {
            elements.progressContainer.classList.remove('hidden');
        }

        aiService.setDownloadProgressCallback((progress) => {
            elements.progressContainer.classList.remove('hidden');
            elements.progressFill.style.width = `${progress}%`;
            elements.progressText.textContent = `${progress}% (Baixando modelo...)`;
            if (progress === 100) {
                setTimeout(() => elements.progressContainer.classList.add('hidden'), 2000);
            }
        });

        loadHistory();
    } catch (error) {
        showError(error.message);
        elements.statusDot.classList.add('error');
    }
}

// Event Listeners
elements.summarizeBtn.addEventListener('click', handleSummarize);
elements.resetBtn.addEventListener('click', () => {
    showScreen('welcome');
    loadHistory();
});
elements.qaBtn.addEventListener('click', handleQA);
elements.translateToggle.addEventListener('click', handleTranslation);
elements.copyBtn.addEventListener('click', handleCopy);
elements.exportBtn.addEventListener('click', handleExport);

elements.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
    });
});

async function handleSummarize() {
    showScreen('loading');
    elements.loadingText.textContent = 'Lendo página...';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Cache Check
        const cacheKey = `cache_${tab.url}_${currentMode}`;
        const cached = await chrome.storage.local.get(cacheKey);
        
        if (cached[cacheKey]) {
            currentPageContent = { title: tab.title, text: "(Cached content)", url: tab.url };
            displayResult(cached[cacheKey], true);
            return;
        }

        const response = await chrome.runtime.sendMessage({
            type: 'REQUEST_PAGE_CONTENT',
            tabId: tab.id
        });

        if (response.error) throw new Error(response.error);
        
        currentPageContent = response;
        elements.loadingText.textContent = 'Destilando conhecimento...';
        
        showScreen('result');
        elements.summaryOutput.innerHTML = '';
        currentSummary = '';

        const stream = await aiService.summarize(
            currentPageContent.title, 
            currentPageContent.text, 
            currentMode
        );

        if (typeof stream === 'string') {
            displayResult(stream);
        } else {
            for await (const chunk of stream) {
                currentSummary += chunk;
                // Append chunk and format (simple streaming update)
                elements.summaryOutput.innerHTML = formatMarkdown(currentSummary);
                elements.summaryOutput.scrollTop = elements.summaryOutput.scrollHeight;
            }
            finalizeResult(currentSummary, cacheKey);
        }

    } catch (error) {
        if (error.name !== 'AbortError') {
            showError(error.message);
        }
    }
}

function displayResult(text, isCached = false) {
    currentSummary = text;
    elements.summaryOutput.innerHTML = formatMarkdown(text);
    showScreen('result');
    if (isCached) {
        const timeSaved = calculateTimeSaved("Lots of words...", text); // Abstracted
        console.log(`Time saved: ~${timeSaved} min`);
    }
}

async function finalizeResult(text, cacheKey) {
    // Save to Cache
    await chrome.storage.local.set({ [cacheKey]: text });
    
    // Save to History
    saveToHistory(currentPageContent.title, text);
    
    const timeSaved = calculateTimeSaved(currentPageContent.text, text);
    const badge = document.createElement('div');
    badge.className = 'time-saved-badge';
    badge.style.fontSize = '0.7rem';
    badge.style.color = 'var(--accent)';
    badge.style.marginTop = '8px';
    badge.innerHTML = `⏱️ Você economizou aproximadamente <strong>${timeSaved} min</strong> de leitura!`;
    elements.summaryOutput.appendChild(badge);
}

async function handleCopy() {
    try {
        await navigator.clipboard.writeText(currentSummary);
        const originalContent = elements.copyBtn.innerHTML;
        elements.copyBtn.innerHTML = '✅';
        setTimeout(() => elements.copyBtn.innerHTML = originalContent, 2000);
    } catch (err) {
        console.error('Falha ao copiar:', err);
    }
}

function handleExport() {
    const blob = new Blob([currentSummary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whisper-${currentPageContent?.title?.slice(0, 20) || 'page'}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

// History Logic
async function saveToHistory(title, summary) {
    const { history = [] } = await chrome.storage.local.get('history');
    
    // Evitar duplicatas no histórico imediato
    if (history.length > 0 && history[0].title === title) return;

    const newItem = {
        title,
        summary,
        date: new Date().toISOString(),
        id: Date.now()
    };
    
    const updatedHistory = [newItem, ...history.filter(h => h.title !== title).slice(0, 9)];
    await chrome.storage.local.set({ history: updatedHistory });
}

async function loadHistory() {
    const { history = [] } = await chrome.storage.local.get('history');
    if (history.length === 0) {
        elements.historySection.classList.add('hidden');
        return;
    }

    elements.historySection.classList.remove('hidden');
    elements.historyList.innerHTML = '';
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-item-title">${item.title}</div>
            <div class="history-item-date">${new Date(item.date).toLocaleDateString()}</div>
        `;
        div.onclick = () => {
            displayResult(item.summary);
        };
        elements.historyList.appendChild(div);
    });
}

async function handleQA() {
    const question = elements.qaInput.value.trim();
    if (!question || !currentPageContent) return;

    elements.qaOutput.classList.remove('hidden');
    elements.qaOutput.innerHTML = '<em>Consultando a página...</em>';
    
    try {
        const stream = await aiService.answerQuestion(currentPageContent.text, question);
        let answer = '';
        elements.qaOutput.innerHTML = '';
        
        for await (const chunk of stream) {
            answer += chunk;
            elements.qaOutput.innerHTML = formatMarkdown(answer);
            elements.qaOutput.scrollTop = elements.qaOutput.scrollHeight;
        }
    } catch (error) {
        elements.qaOutput.textContent = 'Erro: ' + error.message;
    }
}

async function handleTranslation() {
    if (!currentSummary) return;
    
    const originalHTML = elements.summaryOutput.innerHTML;
    const originalText = currentSummary;
    elements.summaryOutput.innerHTML = '<em>Traduzindo resumo...</em>';
    
    try {
        const translated = await translationService.translate(originalText);
        elements.summaryOutput.innerHTML = formatMarkdown(translated);
        elements.translateToggle.textContent = 'Original';
        
        elements.translateToggle.onclick = () => {
            elements.summaryOutput.innerHTML = originalHTML;
            elements.translateToggle.textContent = 'Traduzir';
            elements.translateToggle.onclick = handleTranslation;
        };
    } catch (error) {
        elements.summaryOutput.innerHTML = originalHTML;
        alert('Erro na tradução: ' + error.message);
    }
}

function showScreen(screen) {
    elements.welcomeScreen.classList.add('hidden');
    elements.loadingScreen.classList.add('hidden');
    elements.resultScreen.classList.add('hidden');
    elements.errorScreen.classList.add('hidden');
    
    elements[`${screen}Screen`].classList.remove('hidden');
}

function showError(msg) {
    showScreen('error');
    elements.errorMessage.textContent = msg;
}

init();
