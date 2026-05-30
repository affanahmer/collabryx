import httpx, os
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("SUPABASE_URL", "")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
rest = f'{url}/rest/v1'
headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}

for table in ['profiles', 'posts', 'comments', 'post_reactions', 'connections', 'match_suggestions', 'conversations', 'messages', 'notifications', 'ai_mentor_sessions']:
    r = httpx.get(f'{rest}/{table}?select=count', headers=headers)
    if r.status_code == 200:
        print(f'{table}: {r.json()[0]["count"]} rows')
    else:
        print(f'{table}: ERROR {r.status_code}')
