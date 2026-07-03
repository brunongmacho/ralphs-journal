import requests, json, re, urllib.parse

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

print("1. Getting fb_dtsg token...")
r = requests.get('https://www.messenger.com/', headers=headers, cookies=cookies)
if 'checkpoint' in r.url:
    print("ERROR: Facebook requires login checkpoint. Cookies may be expired.")
    exit()

dtsg_match = re.search(r'"fb_dtsg":"([^"]+)"', r.text) or re.search(r'"DTSGInitialData".*?"token":"([^"]+)"', r.text)
if not dtsg_match:
    print("ERROR: Could not extract fb_dtsg token")
    exit()

dtsg = dtsg_match.group(1)
print(f"DTSG: {dtsg[:20]}...")

# Generate a LSD token
lsd_match = re.search(r'"LSD",\[\],\{"token":"([^"]+)"', r.text)
lsd = lsd_match.group(1) if lsd_match else dtsg

print("2. Fetching thread list...")
def graphql_request(queries):
    data = {
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
        '__rev': '',
        '__s': '',
        '__hs': '19619.HYP:messenger_web_comet_primary',
        'fb_dtsg': dtsg,
        'lsd': lsd,
        '__comet_req': '0',
    }
    data['queries'] = json.dumps(queries)
    r = requests.post('https://www.facebook.com/api/graphqlbatch/', headers={
        **headers,
        'Content-Type': 'application/x-www-form-urlencoded',
    }, cookies=cookies, data=data)
    return r.text

# Fetch thread list
thread_query = {
    "o0": {
        "doc_id": "3336396659757871",
        "query_params": {
            "limit": 50,
            "before": None,
            "tags": ["INBOX"],
            "includeDeliveryReceipts": False,
            "includeSeqID": True,
        }
    }
}
result = graphql_request(thread_query)

# Parse result (may have multiple JSON objects concatenated)
try:
    data = json.loads(result.splitlines()[0] if '\n' in result else result)
    threads = data.get('o0', {}).get('data', {}).get('viewer', {}).get('message_threads', {}).get('nodes', [])
except:
    # Try to find JSON in the response
    json_match = re.search(r'\{.*"o0".*\}', result, re.DOTALL)
    if json_match:
        data = json.loads(json_match.group())
        threads = data.get('o0', {}).get('data', {}).get('viewer', {}).get('message_threads', {}).get('nodes', [])
    else:
        print("Could not parse thread list. Raw response:")
        print(result[:500])
        exit()

print(f"Found {len(threads)} threads\n")
for i, t in enumerate(threads[:15]):
    name = t.get('name', 'Unknown')
    tid = t.get('thread_key', {}).get('thread_fbid', 'N/A')
    count = t.get('messages_count', '?')
    print(f"  [{i}] {name} (ID: {tid}, msgs: {count})")

if not threads:
    print("\nNo threads found. You may need to run this from a browser where you're logged in.")
    exit()
