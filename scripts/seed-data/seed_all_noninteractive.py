#!/usr/bin/env python3
"""
Non-interactive seeder that runs everything in sequence.
Usage: python seed_all_noninteractive.py
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv('.env')

import httpx
from colorama import Fore, Style, init
init()

from config import config
config.initialize()

# Import all seeders
from seeders.profiles_seeder import ProfilesSeeder
from seeders.posts_seeder import PostsSeeder
from seeders.connections_seeder import ConnectionsSeeder
from seeders.matches_seeder import MatchesSeeder
from seeders.conversations_seeder import ConversationsSeeder
from seeders.messages_seeder import MessagesSeeder
from seeders.notifications_seeder import NotificationsSeeder
from seeders.mentor_seeder import MentorSeeder
from seeders.match_preferences_seeder import MatchPreferencesSeeder
from seeders.profile_visits_seeder import ProfileVisitsSeeder
from seeders.user_bookmarks_seeder import UserBookmarksSeeder
from seeders.complementary_pairs_seeder import ComplementaryPairsSeeder

seeders = [
    ("Profiles", lambda c: ProfilesSeeder(c).seed_profiles(count=100)),
    ("Posts", lambda c: PostsSeeder(c).seed(limit=200)),
    ("Connections", lambda c: ConnectionsSeeder(c).seed(limit=300)),
    ("Matches", lambda c: MatchesSeeder(c).seed(limit_per_user=5)),
    ("Match Preferences", lambda c: MatchPreferencesSeeder(c).seed()),
    ("Conversations", lambda c: ConversationsSeeder(c).seed(limit=100)),
    ("Messages", lambda c: MessagesSeeder(c).seed()),
    ("Notifications", lambda c: NotificationsSeeder(c).seed(count=100)),
    ("Mentor Sessions", lambda c: MentorSeeder(c).seed(count=30)),
    ("Profile Visits", lambda c: ProfileVisitsSeeder(c).seed(visits_per_user=3)),
    ("User Bookmarks", lambda c: UserBookmarksSeeder(c).seed(bookmarks_per_user=3)),
    ("Complementary Pairs", lambda c: ComplementaryPairsSeeder(c).seed()),
]

print(f"{Fore.CYAN}{'='*70}{Style.RESET_ALL}")
print(f"{Fore.CYAN}  COLLABRYX FULL SEEDER (Non-Interactive){Style.RESET_ALL}")
print(f"{Fore.CYAN}{'='*70}{Style.RESET_ALL}")
print(f"\n  Batch size: {config.BATCH_SIZE}, Delay: {config.DELAY_BETWEEN_BATCHES}s\n")

start = time.time()

with httpx.Client(timeout=60.0) as client:
    for name, seeder_fn in seeders:
        print(f"\n{Fore.YELLOW}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}  Seeding {name}...{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}{'='*60}{Style.RESET_ALL}")
        try:
            seeder_fn(client)
        except Exception as e:
            print(f"{Fore.RED}  ✗ Error: {e}{Style.RESET_ALL}")
            import traceback
            traceback.print_exc()
        time.sleep(0.5)

elapsed = time.time() - start
print(f"\n{Fore.GREEN}{'='*70}{Style.RESET_ALL}")
print(f"{Fore.GREEN}  ✓ ALL DONE in {elapsed:.1f}s{Style.RESET_ALL}")
print(f"{Fore.GREEN}{'='*70}{Style.RESET_ALL}")
