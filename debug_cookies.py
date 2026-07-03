import requests, re

COOKIE_STR = "xs=15%3AWGb788RptNp6-g%3A2%3A1782647638%3A-1%3A-1%3A%3AAczZBzWGftEZh28Qx4BdqLIHq6896sxN2YZhGTozbA;datr=UgtBaoKKK-b45WEBmlgGgxA4;c_user=787843532;sb=VQtBavsBfMSyBAm0f4T1wZCN;wd=1920x945"

cookies = {}
for c in COOKIE_STR.split(';'):
    c = c.strip()
    if '=' in c:
        k, v = c.split('=', 1)
        cookies[k] = v

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
r = requests.get('https://www.messenger.com/', headers=headers, cookies=cookies, allow_redirects=True)

print('Status:', r.status_code)
print('URL:', r.url)
print()

body = r.text[:10000]

# Check for redirects
if 'login' in r.url.lower():
    print('Redirected to login page - cookies may be expired')
elif 'checkpoint' in r.url.lower():
    print('Redirected to checkpoint - cookies need re-auth')
else:
    # Search for tokens
    for name, pattern in [
        ('fb_dtsg_quoted', r'"fb_dtsg":"([^"]+)"'),
        ('fb_dtsg_single', r"'fb_dtsg':'([^']+)'"),
        ('DTSGInitialData', r'DTSGInitialData.*?token["\']:\s*["\']([^"\']+)'),
        ('LSD', r'"LSD".*?token["\']:\s*["\']([^"\']+)'),
    ]:
        m = re.search(pattern, body)
        if m:
            print(f'Found {name}: {m.group(1)[:40]}')
        else:
            print(f'{name}: NOT FOUND')
    
    print(f'\nResponse body length: {len(r.text)}')
    print('\nFirst 2000 chars of response:')
    print(body[:2000])
