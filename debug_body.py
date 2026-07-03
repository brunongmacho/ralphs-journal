import requests, re, json

COOKIE_STR = "xs=15%3AWGb788RptNp6-g%3A2%3A1782647638%3A-1%3A-1%3A%3AAczZBzWGftEZh28Qx4BdqLIHq6896sxN2YZhGTozbA;datr=UgtBaoKKK-b45WEBmlgGgxA4;c_user=787843532;sb=VQtBavsBfMSyBAm0f4T1wZCN;wd=1920x945"

cookies = {}
for c in COOKIE_STR.split(';'):
    c = c.strip()
    if '=' in c:
        k, v = c.split('=', 1)
        cookies[k] = v

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
r = requests.get('https://www.messenger.com/', headers=headers, cookies=cookies, allow_redirects=True)
body = r.text

# Search for fb_dtsg more broadly
for p in [r'fb_dtsg["\']?\s*[:=]\s*["\']([^"\']+)', r'token["\']?\s*[:=]\s*["\']([^"\']{10,})', r'"__dyn":"([^"]+)"']:
    for m in re.finditer(p, body):
        val = m.group(1)
        if len(val) > 15 and len(val) < 100 and not val.startswith('http'):
            print(f"Pattern {p}: {val[:50]}")
            break

# Search for LSD (Login Security Device)
lsd = re.search(r'"__spin_r"\s*:\s*(\d+)', body)
if lsd: print(f"__spin_r: {lsd.group(1)}")
lsd_b = re.search(r'"__spin_b"\s*:\s*"([^"]+)"', body)
if lsd_b: print(f"__spin_b: {lsd_b.group(1)}")

# Search for server data / initial payload
# Look for large JSON objects that might contain message data
print("\nSearching for message data patterns...")

# Find all script tags and look for JSON
scripts = re.findall(r'<script[^>]*>([^<]+)</script>', body)
for i, s in enumerate(scripts[:20]):
    if len(s) > 500 and ('message' in s.lower() or 'thread' in s.lower() or 'require' in s.lower()):
        print(f"\nScript {i}: length={len(s)}, starts with: {s[:200]}")
        if i < 5:
            print(f"Content excerpt: {s[:500]}")

# Also look for message content directly
msg_patterns = [
    r'"[A-Z][a-z]+ [A-Z][a-z]+ \d+, \d+ at \d+:\d+ [AP]M"',  # dates
    r'"(?:[^"]{10,100}?)(?:HAHAHA|hahaha|haha|hays|puta|shet|grabe|hala)"',  # filipino chat patterns
]
for p in msg_patterns:
    matches = re.findall(p, body)
    if matches:
        print(f"\nFound message-like content: {matches[:5]}")

print(f"\nTotal response size: {len(body)} bytes")

# Let's also try to find the initial query data
# Facebook embeds the initial data in a script tag with specific ID
sid_match = re.search(r'<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>', body, re.DOTALL)
if sid_match:
    print(f"Found __NEXT_DATA__: length={len(sid_match.group(1))}")
else:
    print("No __NEXT_DATA__ found")

# Try to find bootloader data
for bid in ['__bootloader__', 'bootloaderData', 'initialData']:
    m = re.search(f'"{bid}"\s*:\s*({{.+?}})', body)
    if m:
        print(f"Found {bid}")
