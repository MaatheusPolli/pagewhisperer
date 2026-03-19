function extractPageContent() {
  // Common noise selectors
  const noiseSelectors = [
    'nav', 'footer', 'header', 'aside', 'script', 'style', 
    '[role="banner"]', '[role="navigation"]', 'iframe', 'noscript', 
    '.ads', '.sidebar', '.menu', '.footer', '.header', '.ad-container',
    '.social-share', '.comments-section', '.nav-menu'
  ];

  // Clone document to avoid modifying the original page
  const docClone = document.cloneNode(true);
  
  // Remove noise
  noiseSelectors.forEach(selector => {
    docClone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Target common content containers
  const contentSelectors = [
    'article', 'main', '.post-content', '.article-body', '.content-body',
    '#content', '#main', '.entry-content'
  ];

  let mainContent = null;
  for (const selector of contentSelectors) {
    const el = docClone.querySelector(selector);
    if (el && el.innerText.length > 500) {
      mainContent = el;
      break;
    }
  }

  if (!mainContent) {
    mainContent = docClone.body;
  }

  // Scoring-based selection (simplified Readability)
  const paragraphs = mainContent.querySelectorAll('p, div, span');
  let cleanText = "";
  
  paragraphs.forEach(p => {
    const text = p.innerText.trim();
    // Only keep blocks with significant text and few links
    const linkDensity = (p.querySelectorAll('a').length * 20) / (text.length || 1);
    if (text.length > 40 && linkDensity < 0.5) {
      cleanText += text + "\n\n";
    }
  });

  // Final cleanup: remove extra whitespace and truncate to context limit
  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  return {
    title: document.title,
    url: location.href,
    text: cleanText.slice(0, 8000), // Gemini Nano ~8k char limit
    lang: document.documentElement.lang || 'unknown'
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_CONTENT') {
    sendResponse(extractPageContent());
  }
  return true;
});
