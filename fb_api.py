import requests, re, json, time, urllib.parse

COOKIE_STR = "xs=15%3AWGb788RptNp6-g%3A2%3A1782647638%3A-1%3A-1%3A%3AAczZBzWGftEZh28Qx4BdqLIHq6896sxN2YZhGTozbA;datr=UgtBaoKKK-b45WEBmlgGgxA4;c_user=787843532;sb=VQtBavsBfMSyBAm0f4T1wZCN;wd=1920x945"

cookies = {}
for c in COOKIE_STR.split(';'):
    c = c.strip()
    if '=' in c:
        k, v = c.split('=', 1)
        cookies[k] = v

USER_ID = cookies.get('c_user', '')
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Origin': 'https://www.messenger.com',
    'Referer': 'https://www.messenger.com/',
}

# Get fb_dtsg from the main page
print("Fetching tokens...")
r = requests.get('https://www.messenger.com/', headers=headers, cookies=cookies, allow_redirects=True)

# The thread ID is in the redirect URL
thread_id = None
url_match = re.search(r'/e2ee/t/(\d+)/', r.url)
if url_match:
    thread_id = url_match.group(1)
    print(f"Current thread ID: {thread_id}")

# Extract fb_dtsg - it might be in a script tag
dtsg = None
for match in re.finditer(r'"fb_dtsg":"([^"]+)"', r.text):
    dtsg = match.group(1)
    break

if not dtsg:
    # Try looking in script content more broadly
    for match in re.finditer(r'fb_dtsg["\']?\s*[:=]\s*["\']([^"\']+)["\']?', r.text):
        val = match.group(1)
        if len(val) > 10 and val != 'null' and 'undefined' not in val:
            dtsg = val
            break

if not dtsg:
    # Try the iframe compat token
    match = re.search(r'"compat_iframe_token"\s*:\s*"([^"]+)"', r.text)
    if match:
        dtsg = match.group(1)
        print(f"Using compat_iframe_token as dtsg: {dtsg[:30]}...")
    else:
        print("Could not find dtsg")
        exit()

print(f"fb_dtsg: {dtsg[:30]}...")

# Try to call the GraphQL API to load messages
# This is the doc_id used by Messenger web for loading thread messages
message_doc_id = "4475022946842152"  # Common doc_id for loading messages

print(f"\nFetching messages for thread {thread_id}...")

# GraphQL request for messages
queries = {
    "o0": {
        "doc_id": message_doc_id,
        "query_params": {
            "id": thread_id,
            "message_limit": 50,
            "load_messages": True,
            "load_older_messages": True,
            "offset": 0,
        }
    }
}

# Build the form data
form_data = {
    'av': USER_ID,
    '__user': USER_ID,
    '__a': '1',
    '__dyn': '7Agb5e4G9z5U4e4G9z5U9m5G2S2e4G9z5U4e4G9z5U4e4G9z5U4e4G9z5U4e4G9z5U4e4G9z5U4e4G9z5U4e4G9z5U4e4G9z5E',
    '__csr': '',
    '__req': '1',
    '__be': '1',
    '__pc': 'PHASED:DEFAULT',
    'dpr': '1',
    '__ccg': 'GOOD',
    'fb_dtsg': dtsg,
    '__comet_req': '0',
    'lsd': '',
    'jazoest': '',
}
form_data['queries'] = json.dumps(queries)

msg_r = requests.post(
    'https://www.facebook.com/api/graphqlbatch/',
    headers=headers, cookies=cookies, data=form_data
)

print(f"API Status: {msg_r.status_code}")
print(f"Response preview: {msg_r.text[:1000]}")
