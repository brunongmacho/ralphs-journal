import re

inpath = r'C:\Users\RB\Desktop\Journal\elaine.html'
outpath = r'C:\Users\RB\Desktop\Journal\elaine.txt'

with open(inpath, 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'<svg[^>]*>.*?</svg>', '', html, flags=re.DOTALL)
html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)

# Match containers
pattern = r'(<div[^>]*class\s*=\s*["\']?chatlog__message-container["\']?[^>]*>)'
matches = list(re.finditer(pattern, html))

lines = []
for idx, m in enumerate(matches):
    end = matches[idx + 1].start() if idx + 1 < len(matches) else len(html)
    msg = html[m.start():end]
    
    author_m = re.search(r'<span\s+class\s*=\s*["\']?chatlog__author["\']?[^>]*>\s*([^<]+)\s*</span>', msg)
    ts_m = re.search(r'class\s*=\s*["\']?chatlog__timestamp["\']?[^>]*>\s*<a[^>]*>\s*([^<]+)\s*</a>', msg)
    if not ts_m:
        ts_m = re.search(r'class\s*=\s*["\']?chatlog__timestamp["\']?[^>]*>\s*([^<]+)\s*<', msg)
    
    content_m = re.search(r'<span\s+class\s*=\s*["\']?chatlog__markdown-preserve["\']?>(.*?)</span>', msg, re.DOTALL)
    
    author = author_m.group(1).strip() if author_m else ''
    ts = ts_m.group(1).strip() if ts_m else ''
    
    text = ''
    if content_m:
        raw = content_m.group(1)
        text = re.sub(r'<[^>]+>', '', raw)
        text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        text = text.replace('&#39;', "'").replace('&quot;', '"').replace('&#10;', '\n')
        text = re.sub(r'&#(\d+);', lambda x: chr(int(x.group(1))) if int(x.group(1)) < 0x110000 else '', text)
        text = re.sub(r'&#x([0-9a-fA-F]+);', lambda x: chr(int(x.group(1), 16)) if int(x.group(1), 16) < 0x110000 else '', text)
        text = ' '.join(text.split())
    
    img_m = re.findall(r'<img[^>]*class\s*=\s*["\']?chatlog__attachment-media["\']?[^>]*title\s*=\s*["\']([^"\']*)["\']', msg)
    if img_m:
        if text: text += ' '
        text += ' '.join(f'[{t}]' for t in img_m)

    if text and author and ts:
        lines.append(f'[{ts}] {author}: {text}')

with open(outpath, 'w', encoding='utf-8') as f:
    f.write('Discord Chat Log - R O S S\n')
    f.write('=' * 50 + '\n\n')
    f.write('\n'.join(lines))
    f.write(f'\n\n--- End of log ({len(lines)} messages) ---\n')

print(f'Done! {len(lines)} messages extracted.')
