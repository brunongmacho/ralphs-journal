// Paste this in Console after typing "allow pasting"
(async () => {
  let msgs = new Map();
  let container = document.querySelector('[role="main"]') || document.querySelector('[role="log"]');
  if (!container) return alert('Open a conversation first');

  let stuck = 0;
  for (let i = 0; i < 200; i++) { // max 200 scrolls
    let prev = container.scrollTop;
    container.scrollBy(0, -800);
    await new Promise(r => setTimeout(r, 1500));

    // Collect all message elements currently in DOM
    container.querySelectorAll('[data-message-id]').forEach(el => {
      let id = el.getAttribute('data-message-id');
      if (id && !msgs.has(id)) {
        let author = el.querySelector('[data-testid="message-author-name"]');
        let text = el.querySelector('[data-testid="message-content"]');
        let time = el.querySelector('time');
        msgs.set(id, {
          author: author?.textContent?.trim() || '',
          text: text?.textContent?.trim() || '[media]',
          time: time?.getAttribute('title') || time?.textContent || ''
        });
      }
    });

    if (container.scrollTop === prev) {
      stuck++;
      if (stuck > 3) break; // reached top
    } else {
      stuck = 0;
    }
  }

  // Sort by message ID (chronological)
  let sorted = [...msgs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let output = sorted.map(([_, m]) => `[${m.time}] ${m.author}: ${m.text}`).join('\n');

  console.log(output);
  console.log(`\n--- Total: ${msgs.size} messages ---`);

  try {
    await navigator.clipboard.writeText(output);
    console.log('✓ Copied to clipboard!');
  } catch {
    console.log('⚠ Copy manually from console output above');
  }
})();
