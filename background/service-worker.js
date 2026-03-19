chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'REQUEST_PAGE_CONTENT') {
    // Forward the request to the content script of the specified tab
    const targetTabId = msg.tabId || sender.tab?.id;
    
    if (!targetTabId) {
        sendResponse({ error: 'No active tab found' });
        return true;
    }

    chrome.tabs.sendMessage(targetTabId, { type: 'GET_PAGE_CONTENT' }, (content) => {
        if (chrome.runtime.lastError) {
            sendResponse({ error: 'Could not contact content script. Please refresh the page.' });
        } else {
            sendResponse(content);
        }
    });
    return true; // Keep channel open for async response
  }
});
