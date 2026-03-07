"""Close all open GitLab issues for a phase. Usage: python close-phase-issues.py phase-04"""
import urllib.request
import json
import sys

GITLAB_HOST = 'https://gitlabs.inet.vn'
PROJECT_ID = 296
TOKEN_PATH = r'D:\CONG VIEC\localman\gitlab-authen.txt'

def read_token():
    with open(TOKEN_PATH) as f:
        for line in f:
            if 'access token:' in line.lower() or 'token:' in line:
                return line.split(':', 1)[1].strip()
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
    label = sys.argv[1] if len(sys.argv) > 1 else 'phase-04'
    issues = gitlab('GET', f'/issues?labels={label}&state=opened&per_page=50')
    if not issues:
        print(f'No open issues with label {label}')
        return
    for i in issues:
        iid = i['iid']
        title = i.get('title', '')
        gitlab('PUT', f'/issues/{iid}', {
            'state_event': 'close',
            'add_labels': 'status::done',
            'remove_labels': 'status::in-progress'
        })
        print(f'Closed #{iid}: {title}')
    print(f'Closed {len(issues)} issue(s) for {label}')

if __name__ == '__main__':
    main()
