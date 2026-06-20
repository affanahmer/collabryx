"""
Profile Visits Seeder
Creates profile_visits entries (7-day dedup window) for realistic traffic patterns
"""

import random
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from colorama import Fore, Style

from config import config
from seeders.base_seeder import BaseSeeder


class ProfileVisitsSeeder(BaseSeeder):
    """Seeder for profile_visits table"""

    def __init__(self, http_client):
        super().__init__(http_client)
        self.stats = {"created": 0, "skipped": 0, "failed": 0}
        self._existing_visits: set = set()

    def _load_cache(self):
        """Fetch existing profile_visits to skip duplicates"""
        try:
            records = self.fetch_existing_ids("profile_visits", "id", ["viewer_id", "viewed_id"])
            self._existing_visits = {(r["viewer_id"], r["viewed_id"]) for r in records}
            print(f"{Fore.YELLOW}  \u2192 Found {len(self._existing_visits)} existing profile visits{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}\u2717 Failed to fetch existing visits: {e}{Style.RESET_ALL}")
            self._existing_visits = set()

    def seed(self, visits_per_user: int = None) -> Dict[str, int]:
        """Seed profile visits between users"""
        self.stats = {"created": 0, "skipped": 0, "failed": 0}
        if visits_per_user is None:
            visits_per_user = 3

        print(f"\n{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}SEEDING PROFILE VISITS{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")

        self._load_cache()
        user_ids = self.fetch_user_ids()

        if len(user_ids) < 2:
            print(f"{Fore.RED}  \u2717 Need at least 2 users. Seed profiles first.{Style.RESET_ALL}")
            return self.stats

        total = min(len(user_ids), 50)
        now = datetime.utcnow()

        for i, viewer_id in enumerate(user_ids[:total]):
            candidates = [u for u in user_ids if u != viewer_id]
            targets = random.sample(candidates, min(visits_per_user, len(candidates)))

            for viewed_id in targets:
                if (viewer_id, viewed_id) in self._existing_visits:
                    self.stats["skipped"] += 1
                    continue

                days_ago = random.randint(0, 6)
                viewed_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
                expires_at = viewed_at + timedelta(days=7)

                visit = {
                    "viewer_id": viewer_id,
                    "viewed_id": viewed_id,
                    "viewed_at": viewed_at.isoformat(),
                    "expires_at": expires_at.isoformat(),
                }

                result = self.create_single("profile_visits", visit, track=False)
                if result:
                    self._existing_visits.add((viewer_id, viewed_id))
                    self.stats["created"] += 1
                else:
                    self.stats["failed"] += 1

            if (i + 1) % config.BATCH_SIZE == 0:
                time.sleep(config.DELAY_BETWEEN_BATCHES)

        self.log_stats(self.stats, "Profile Visits")
        return self.stats
