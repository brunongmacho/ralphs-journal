// Paste this into Chrome Dev Tools Console (Ctrl+Shift+J) on messenger.com
// Make sure the conversation you want is OPEN and FULLY LOADED by scrolling up

(async () => {
  // Auto-scroll to load all messages
  let prevHeight = 0;
  while (true) {
    const scrollDiv = document.querySelector('[role="main"]') || 
                      document.querySelector('[role="log"]') ||
                      document.querySelector('.mfdgmlji');
    if (!scrollDiv) break;
    scrollDiv.scrollTop = 0;
    await new Promise(r => setTimeout(r, 2000));
    const newHeight = scrollDiv.scrollHeight;
    if (newHeight === prevHeight) break;
    prevHeight = newHeight;
  }

  // Extract messages
  const msgElements = document.querySelectorAll('[data-message-id]');
  let output = '';
  msgElements.forEach(el => {
    const author = el.querySelector('[data-testid="message-author-name"]');
    const text = el.querySelector('[data-testid="message-content"]');
    const time = el.querySelector('time');
    const name = author?.textContent?.trim() || '';
    const msg = text?.textContent?.trim() || '[non-text message]';
    const ts = time?.getAttribute('title') || time?.textContent || '';
    if (name) output += `[${ts}] ${name}: ${msg}\n`;
  });

  console.log(output);
  console.log(`\n--- Total: ${msgElements.length} messages ---`);

  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(output);
    console.log('✓ Copied to clipboard!');
  } catch {
    console.log('⚠ Could not copy. Right-click the output above and copy manually.');
  }
})();
