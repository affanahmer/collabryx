"""
Complementary Pairs Seeder
Seeds learned complementary skill category pairs for the matching algorithm
"""

import random
import time
from typing import List, Dict, Optional
from colorama import Fore, Style

from config import config
from seeders.base_seeder import BaseSeeder


class ComplementaryPairsSeeder(BaseSeeder):
    """Seeder for complementary_pairs table"""

    def __init__(self, http_client):
        super().__init__(http_client)
        self.stats = {"created": 0, "skipped": 0, "failed": 0}

    def seed(self) -> Dict[str, int]:
        """Seed complementary skill category pairs based on known high-value cross-domain combos"""
        self.stats = {"created": 0, "skipped": 0, "failed": 0}

        print(f"\n{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}SEEDING COMPLEMENTARY PAIRS{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")

        # High-value complementary pairs (different domains = strong match potential)
        high_value_pairs = [
            ("frontend", "backend", 92, 150, 45),
            ("frontend", "devops", 78, 80, 22),
            ("backend", "devops", 88, 120, 38),
            ("backend", "database", 85, 110, 35),
            ("ai_ml", "data", 90, 140, 42),
            ("ai_ml", "backend", 82, 95, 30),
            ("mobile", "backend", 75, 70, 20),
            ("design", "frontend", 85, 110, 36),
            ("design", "backend", 65, 50, 14),
            ("business", "marketing", 80, 90, 28),
            ("business", "frontend", 60, 40, 10),
            ("security", "devops", 82, 85, 26),
            ("blockchain", "backend", 72, 55, 18),
            ("gaming", "mobile", 76, 60, 16),
            ("data", "business", 78, 75, 22),
            ("marketing", "design", 74, 65, 20),
        ]

        for cat_a, cat_b, score, co_occurrence, connections in high_value_pairs:
            pair = {
                "category_a": cat_a,
                "category_b": cat_b,
                "score": score,
                "co_occurrence_count": co_occurrence,
                "connection_count": connections,
            }
            result = self.create_single("complementary_pairs", pair, track=False)
            if result:
                self.stats["created"] += 1
            else:
                self.stats["skipped"] += 1

        # Also seed same-category pairs (lower score — peers in same domain)
        categories = list(config.SKILL_CATEGORIES.keys())
        for i, cat in enumerate(categories[:8]):
            same_pair = {
                "category_a": cat,
                "category_b": cat,
                "score": random.randint(35, 55),
                "co_occurrence_count": random.randint(200, 500),
                "connection_count": random.randint(50, 150),
            }
            result = self.create_single("complementary_pairs", same_pair, track=False)
            if result:
                self.stats["created"] += 1
            else:
                self.stats["skipped"] += 1

        self.log_stats(self.stats, "Complementary Pairs")
        return self.stats
