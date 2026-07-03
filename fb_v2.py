import json, re, time, requests
from fbchat_v2._core._session import dataGetHome
from fbchat_v2._core._utils import formAll, mainRequests
from fbchat_v2._features._thread import _all_thread_data

COOKIE_STR = "xs=15%3AWGb788RptNp6-g%3A2%3A1782647638%3A-1%3A-1%3A%3AAczZBzWGftEZh28Qx4BdqLIHq6896sxN2YZhGTozbA;datr=UgtBaoKKK-b45WEBmlgGgxA4;c_user=787843532;sb=VQtBavsBfMSyBAm0f4T1wZCN;wd=1920x945"

print("Authenticating with Facebook...")
dataFB = dataGetHome(COOKIE_STR)
print(f"Facebook ID: {dataFB.get('FacebookID', '?')}")
print(f"fb_dtsg: {str(dataFB.get('fb_dtsg', '?'))[:30]}")

if 'Unable to retrieve' in str(dataFB.get('fb_dtsg', '')):
    print("ERROR: Could not authenticate. Cookies may be expired.")
    exit()

print("\nFetching thread list...")
thread_data = _all_thread_data.func(dataFB)
print(f"Processing time: {thread_data.get('ProcessingTime', '?')}s")

all_threads = thread_data.get('dataAllThread', {})
if 'error' in all_threads:
    print(f"ERROR: {all_threads['error']}")
    print(f"Raw data: {thread_data.get('dataGet', '')[:500]}")
    exit()

thread_ids = all_threads.get('threadIDList', [])
thread_names = all_threads.get('threadNameList', [])
count = all_threads.get('countThread', 0)

print(f"Found {count} threads:")
for i, (tid, name) in enumerate(zip(thread_ids, thread_names)):
    print(f"  [{i}] {name} (ID: {tid})")

if count == 0:
    print("\nNo threads found. Raw response:")
    print(thread_data.get('dataGet', '')[:1000])
    exit()

# Let user pick a thread
print("\nNow I need to know which conversation to export.")
print("Tell me the name or number from the list above.")
