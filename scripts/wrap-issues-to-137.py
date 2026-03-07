"""Close open issues #120-#136 and add a wrap note to (closed) issue #137.
Uses GitLab API; token from gitlab-authen.txt.
"""
import urllib.request
import json
import sys

GITLAB_HOST = 'https://gitlabs.inet.vn'
PROJECT_ID = 296
TOKEN_PATH = r'D:\CONG VIEC\localman\gitlab-authen.txt'
WRAP_TARGET_IID = 137
ISSUE_IDS_TO_CLOSE = list(range(120, 137))  # 120..136

def read_token():
    try:
        with open(TOKEN_PATH) as f:
            for line in f:
                if 'access token:' in line.lower() or 'token:' in line:
                    return line.split(':', 1)[1].strip()
    except FileNotFoundError:
        pass
    raise SystemExit('Token not found in ' + TOKEN_PATH)

def gitlab(method, path, data=None):
    token = read_token()
    url = f'{GITLAB_HOST}/api/v4/projects/{PROJECT_ID}{path}'
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(
        url, data=body, method=method,
        headers={'PRIVATE-TOKEN': token, 'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def main():
    dry = '--dry-run' in sys.argv
    if dry:
        print('DRY RUN - no API writes')

    # 1) Add note to #137 (closed): list of wrapped issues
    refs = ', '.join(f'#{i}' for i in ISSUE_IDS_TO_CLOSE)
    body_137 = (
        f"**Batch wrap (code-review vs codebase):**\n\n"
        f"The following issues were verified against the codebase and have been closed as implemented. "
        f"They are wrapped here for traceability:\n\n{refs}\n\n"
        f"Source: codebase cross-check per docs/gitlab-workflow-guide.md."
    )
    if not dry:
        gitlab('POST', f'/issues/{WRAP_TARGET_IID}/notes', {'body': body_137})
        print(f'Added wrap note to #{WRAP_TARGET_IID}')
    else:
        print(f'Would add note to #{WRAP_TARGET_IID}:', body_137[:80] + '...')

    # 2) For each #120..#136: add note "Implemented. Wrapped into #137." then close
    for iid in ISSUE_IDS_TO_CLOSE:
        note = f"Implemented and verified against codebase. Wrapped into #{WRAP_TARGET_IID}."
        if not dry:
            gitlab('POST', f'/issues/{iid}/notes', {'body': note})
            gitlab('PUT', f'/issues/{iid}', {'state_event': 'close'})
            print(f'Closed #{iid}')
        else:
            print(f'Would add note and close #{iid}')

    print(f'Done. {"(dry run)" if dry else ""}')

if __name__ == '__main__':
    main()
