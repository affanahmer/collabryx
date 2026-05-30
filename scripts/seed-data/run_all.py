"""
Run all seeders sequentially with proper HTTP client initialization
"""
import sys, os, time
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from dotenv import load_dotenv
load_dotenv('.env')

os.environ['INCREMENTAL_SEEDING'] = 'true'

import httpx
from config import SeedConfig as config
from seeders.posts_seeder import PostsSeeder
from seeders.social_seeder import SocialSeeder
from seeders.matches_seeder import MatchesSeeder
from seeders.conversations_seeder import ConversationsSeeder
from seeders.messages_seeder import MessagesSeeder
from seeders.notifications_seeder import NotificationsSeeder
from seeders.mentor_seeder import MentorSeeder

# Initialize config
config.validate()
config.initialize()

client = httpx.Client(timeout=httpx.Timeout(60.0, connect=30.0))

def run_seeder(name, seeder):
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")
    try:
        seeder()
    except Exception as e:
        print(f"  ✗ Error: {e}")
    time.sleep(1)

from seeders.connections_seeder import ConnectionsSeeder

run_seeder("Posts (with comments/reactions)", lambda: PostsSeeder(client).seed(limit=300))
run_seeder("Connections", lambda: ConnectionsSeeder(client).seed(limit=500))
run_seeder("Matches", lambda: MatchesSeeder(client).seed(limit_per_user=5))
run_seeder("Conversations", lambda: ConversationsSeeder(client).seed(limit=150))
run_seeder("Messages", lambda: MessagesSeeder(client).seed())
run_seeder("Notifications", lambda: NotificationsSeeder(client).seed(count=100))
run_seeder("Mentor Sessions", lambda: MentorSeeder(client).seed(count=50))

client.close()
