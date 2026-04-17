// ==================== Content Script ====================
// Reads page content for AI-powered tab classification

(function () {
  'use strict';

  // Prevent double injection
  if ((window as any).__tabManagerContentLoaded) return;
  (window as any).__tabManagerContentLoaded = true;

  interface ContentMessage {
    type: 'EXTRACT_CONTENT';
  }

  interface ContentResponse {
    title: string;
    description: string;
    headings: string[];
    mainContent: string;
    url: string;
  }

  function extractPageContent(): ContentResponse {
    const title = document.title || '';

    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    const description = metaDesc?.getAttribute('content') || '';

    // Headings (first 10)
    const headingElements = document.querySelectorAll('h1, h2, h3');
    const headings = Array.from(headingElements)
      .slice(0, 10)
      .map(el => el.textContent?.trim() || '')
      .filter(Boolean);

    // Main content extraction
    let mainContent = '';

    // Try to find main content area
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.article-body',
      '#content',
      '#main',
    ];

    let contentEl: Element | null = null;
    for (const selector of mainSelectors) {
      contentEl = document.querySelector(selector);
      if (contentEl) break;
    }

    if (!contentEl) {
      contentEl = document.body;
    }

    // Extract text content, limited to first 2000 chars
    mainContent = contentEl.textContent?.trim() || '';
    mainContent = mainContent.replace(/\s+/g, ' ').substring(0, 2000);

    return {
      title,
      description,
      headings,
      mainContent,
      url: window.location.href,
    };
  }

  // Listen for messages from background/popup
  chrome.runtime.onMessage.addListener(
    (message: ContentMessage, _sender, sendResponse) => {
      if (message.type === 'EXTRACT_CONTENT') {
        try {
          const content = extractPageContent();
          sendResponse(content);
        } catch (error) {
          sendResponse({
            title: document.title,
            description: '',
            headings: [],
            mainContent: '',
            url: window.location.href,
          });
        }
        return true;
      }
    }
  );

  // Auto-send content snippet to background on load (only if user enabled AI)
  try {
    chrome.storage.sync.get('tabManager_settings', (result) => {
      const settings = result.tabManager_settings;
      const contentExtractionEnabled = settings && (settings.enableAI || settings.autoGroup);
      if (!contentExtractionEnabled) return;

      const snippet = extractPageContent();
      chrome.runtime.sendMessage({
        type: 'CONTENT_EXTRACTED',
        payload: {
          contentSnippet: `${snippet.title} ${snippet.description} ${snippet.headings.slice(0, 3).join(' ')} ${snippet.mainContent.substring(0, 500)}`,
        },
      }).catch(() => {});
    });
  } catch {
    // Ignore errors
  }
})();
