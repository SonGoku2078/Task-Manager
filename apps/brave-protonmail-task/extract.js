// Injected into the Protonmail tab to read the currently open e-mail.
// Proton's DOM changes over time, so we try a few selectors and fall back to
// the document title. Returns a plain object (must be JSON-serialisable).
function extractProtonMail() {
  const pick = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el && el.textContent && el.textContent.trim();
      if (text) return text;
    }
    return '';
  };

  // Subject: prefer the open conversation heading, else the tab title.
  let subject = pick([
    '[data-testid="conversation-header:subject"]',
    '[data-testid="message-header:subject"]',
    'h1[class*="subject"]',
    '.message-conversation-summary-header h1',
  ]);
  if (!subject) {
    subject = (document.title || '').replace(/\s*[|–-]\s*Proton Mail.*$/i, '').trim();
  }

  const sender = pick([
    '[data-testid="message-header:from"]',
    '[data-testid="recipient:item-label"]',
    'span[class*="sender"] [title]',
    'span[class*="Sender"]',
  ]);

  // A short preview of the body, if a message is expanded.
  const bodyEl = document.querySelector(
    '[data-testid="message-content:body"], .message-content, iframe.message-content'
  );
  let snippet = '';
  if (bodyEl && bodyEl.textContent) {
    snippet = bodyEl.textContent.trim().replace(/\s+/g, ' ').slice(0, 400);
  }

  return {
    subject: subject || 'E-Mail ohne Betreff',
    sender,
    url: location.href,
    snippet,
  };
}

// The script's last expression is returned to chrome.scripting.executeScript.
extractProtonMail();
