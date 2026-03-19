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

// Initialize
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

// Handlers
async function handleSummarize() {
    showScreen('loading');
    elements.loadingText.textContent = 'Extraindo conteúdo da página...';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const response = await chrome.runtime.sendMessage({
            type: 'REQUEST_PAGE_CONTENT',
            tabId: tab.id
        });

        if (response.error) throw new Error(response.error);
        
        currentPageContent = response;
        elements.loadingText.textContent = 'Gerando resumo...';
        
        showScreen('result');
        elements.summaryOutput.textContent = '';
        currentSummary = '';

        const stream = await aiService.summarize(
            currentPageContent.title, 
            currentPageContent.text, 
            currentMode
        );

        if (typeof stream === 'string') {
            currentSummary = stream;
            elements.summaryOutput.textContent = stream;
        } else {
            for await (const chunk of stream) {
                currentSummary += chunk;
                elements.summaryOutput.textContent = currentSummary;
                elements.summaryOutput.scrollTop = elements.summaryOutput.scrollHeight;
            }
        }

        saveToHistory(currentPageContent.title, currentSummary);

    } catch (error) {
        if (error.name !== 'AbortError') {
            showError(error.message);
        }
    }
}

async function handleCopy() {
    try {
        await navigator.clipboard.writeText(currentSummary);
        const originalText = elements.copyBtn.textContent;
        elements.copyBtn.textContent = '✅';
        setTimeout(() => elements.copyBtn.textContent = originalText, 2000);
    } catch (err) {
        console.error('Falha ao copiar:', err);
    }
}

function handleExport() {
    const blob = new Blob([currentSummary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo-${currentPageContent?.title?.slice(0, 20) || 'page'}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

// History Logic
async function saveToHistory(title, summary) {
    const { history = [] } = await chrome.storage.local.get('history');
    const newItem = {
        title,
        summary,
        date: new Date().toISOString(),
        id: Date.now()
    };
    
    const updatedHistory = [newItem, ...history.slice(0, 4)]; // Keep last 5
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
            <div class="history-item-date">${new Date(item.date).toLocaleString()}</div>
        `;
        div.onclick = () => {
            currentSummary = item.summary;
            elements.summaryOutput.textContent = item.summary;
            showScreen('result');
        };
        elements.historyList.appendChild(div);
    });
}

async function handleQA() {
    const question = elements.qaInput.value.trim();
    if (!question || !currentPageContent) return;

    elements.qaOutput.classList.remove('hidden');
    elements.qaOutput.textContent = 'Pensando...';
    
    try {
        const stream = await aiService.answerQuestion(currentPageContent.text, question);
        let answer = '';
        elements.qaOutput.textContent = '';
        
        for await (const chunk of stream) {
            answer += chunk;
            elements.qaOutput.textContent = answer;
        }
    } catch (error) {
        elements.qaOutput.textContent = 'Erro: ' + error.message;
    }
}

async function handleTranslation() {
    if (!currentSummary) return;
    
    const originalText = elements.summaryOutput.textContent;
    elements.summaryOutput.textContent = 'Traduzindo...';
    
    try {
        const translated = await translationService.translate(currentSummary);
        elements.summaryOutput.textContent = translated;
        elements.translateToggle.textContent = 'Ver Original';
        
        // Toggle back logic
        elements.translateToggle.onclick = () => {
            elements.summaryOutput.textContent = originalText;
            elements.translateToggle.textContent = 'Traduzir para PT';
            elements.translateToggle.onclick = handleTranslation;
        };
    } catch (error) {
        elements.summaryOutput.textContent = originalText;
        alert('Erro na tradução: ' + error.message);
    }
}

// Helpers
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
