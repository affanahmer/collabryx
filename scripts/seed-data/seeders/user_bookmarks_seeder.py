"""
User Bookmarks Seeder
Creates user_bookmarks entries for post bookmarking feature
"""

import random
import time
from typing import List, Dict, Any, Optional
from colorama import Fore, Style

from config import config
from seeders.base_seeder import BaseSeeder


class UserBookmarksSeeder(BaseSeeder):
    """Seeder for user_bookmarks table"""

    def __init__(self, http_client):
        super().__init__(http_client)
        self.stats = {"created": 0, "skipped": 0, "failed": 0}
        self._existing_bookmarks: set = set()

    def _load_cache(self):
        """Fetch existing bookmarks to skip duplicates"""
        try:
            records = self.fetch_existing_ids("user_bookmarks", "id", ["post_id", "user_id"])
            self._existing_bookmarks = {(r["user_id"], r["post_id"]) for r in records}
            print(f"{Fore.YELLOW}  \u2192 Found {len(self._existing_bookmarks)} existing bookmarks{Style.RESET_ALL}")
        except Exception:
            self._existing_bookmarks = set()

    def seed(self, bookmarks_per_user: int = None) -> Dict[str, int]:
        """Seed bookmarks: each user bookmarks some posts"""
        self.stats = {"created": 0, "skipped": 0, "failed": 0}
        if bookmarks_per_user is None:
            bookmarks_per_user = 3

        print(f"\n{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}SEEDING USER BOOKMARKS{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")

        self._load_cache()
        user_ids = self.fetch_user_ids()
        posts = self.fetch_existing_posts()

        if not user_ids or not posts:
            print(f"{Fore.RED}  \u2717 No users or posts found. Seed profiles and posts first.{Style.RESET_ALL}")
            return self.stats

        total = min(len(user_ids), 50)

        for i, user_id in enumerate(user_ids[:total]):
            available = [p for p in posts if p["author_id"] != user_id]
            if len(available) < 1:
                continue

            targets = random.sample(available, min(bookmarks_per_user, len(available)))

            for post in targets:
                post_id = post["id"]
                if (user_id, post_id) in self._existing_bookmarks:
                    self.stats["skipped"] += 1
                    continue

                bookmark = {"post_id": post_id, "user_id": user_id}
                result = self.create_single("user_bookmarks", bookmark, track=False)
                if result:
                    self._existing_bookmarks.add((user_id, post_id))
                    self.stats["created"] += 1
                else:
                    self.stats["failed"] += 1

            if (i + 1) % config.BATCH_SIZE == 0:
                time.sleep(config.DELAY_BETWEEN_BATCHES)

        self.log_stats(self.stats, "User Bookmarks")
        return self.stats
