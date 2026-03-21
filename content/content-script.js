chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PAGE_CONTENT') {
        try {
            // Clone the body to avoid mutating the live page
            const bodyClone = document.body.cloneNode(true);
            
            // Remove noise
            const noise = bodyClone.querySelectorAll('script, style, nav, footer, iframe, noscript, .ads, #ads');
            noise.forEach(el => el.remove());

            const content = {
                title: document.title,
                text: bodyClone.innerText.replace(/\s+/g, ' ').trim(),
                url: window.location.href
            };
            
            sendResponse(content);
        } catch (error) {
            sendResponse({ error: "Failed to extract content: " + error.message });
        }
    }
    return true; // Keep channel open for async
});
