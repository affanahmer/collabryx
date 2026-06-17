#!/usr/bin/env python3
"""
Notification Fanout Simulation — Main Entry Point

Usage:
    python run.py                          # Default: all strategies, 50 notifs, 100 users
    python run.py --notifications 100      # Custom notification count
    python run.py --users 500              # Custom user count
    python run.py --strategies thread gossip  # Only specific strategies
    python run.py --no-plots               # Skip plot generation
    python run.py --scale                  # Run scaling analysis (sweeps user counts)
    python run.py --seed 123               # Fixed random seed
"""

from __future__ import annotations

import argparse
import logging
import sys
import os

# Add parent to path so we can import sibling modules
sys.path.insert(0, os.path.dirname(__file__))

import simulation
import plots

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Notification Fanout — Parallel & Distributed Computing Demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("-n", "--notifications", type=int, default=50,
                        help="Number of notifications to fan out")
    parser.add_argument("-u", "--users", type=int, default=100,
                        help="Number of recipient users per notification")
    parser.add_argument("-s", "--strategies", nargs="+",
                        choices=list(simulation.STRATEGIES.keys()),
                        help="Strategies to run (default: all)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducibility")
    parser.add_argument("--no-plots", action="store_true",
                        help="Skip plot generation")
    parser.add_argument("--scale", action="store_true",
                        help="Run scaling analysis (sweeps user counts)")
    parser.add_argument("--gossip-only", action="store_true",
                        help="Run only gossip strategy (faster)")
    return parser.parse_args()


def run_single(args: argparse.Namespace) -> dict:
    """Run a single simulation with given parameters."""
    strategies = args.strategies
    if args.gossip_only:
        strategies = ["gossip"]

    print(f"\n{'='*60}")
    print(f"  Notification Fanout Simulation")
    print(f"{'='*60}")
    print(f"  Notifications: {args.notifications}")
    print(f"  Users:         {args.users}")
    print(f"  Strategies:    {strategies or 'all'}")
    print(f"{'='*60}\n")

    results = simulation.run_simulation(
        notification_count=args.notifications,
        user_count=args.users,
        strategies=strategies,
        seed=args.seed,
    )

    simulation.print_report(results)
    return results


def run_scaling(args: argparse.Namespace) -> dict:
    """Run simulations across multiple user counts to show scaling."""
    user_counts = [10, 25, 50, 100, 200, 500]
    strategies = args.strategies or list(simulation.STRATEGIES.keys())
    all_results: dict[int, dict] = {}

    print(f"\n{'='*60}")
    print(f"  Scaling Analysis — Sweeping User Count")
    print(f"{'='*60}")

    for uc in user_counts:
        print(f"\n  ── Users: {uc} ──")
        results = simulation.run_simulation(
            notification_count=args.notifications,
            user_count=uc,
            strategies=strategies,
            seed=args.seed,
        )
        all_results[uc] = results

    return all_results


def main():
    args = parse_args()

    # Get CPU info
    from multiprocessing import cpu_count
    logger.info(f"[CPU] Cores detected: {cpu_count()}")

    if args.scale:
        all_results = run_scaling(args)
        if not args.no_plots:
            # Plot scaling from the last run's results (just need structure)
            plots.generate_all_plots(list(all_results.values())[-1])
            # Plot scaling curve
            # Need to restructure: user_count -> strategy -> time
            from collections import defaultdict
            by_strategy: dict[str, dict[int, simulation.DeliveryReport]] = defaultdict(dict)
            for uc, results in all_results.items():
                for name, report in results.items():
                    by_strategy[name][uc] = report
            plots.plot_scaling_with_users(by_strategy)
    else:
        results = run_single(args)
        if not args.no_plots:
            plots.generate_all_plots(results)

    print("\n[Done]")


if __name__ == "__main__":
    main()
