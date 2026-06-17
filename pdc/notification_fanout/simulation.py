"""
Notification Fanout Simulation — Parallel & Distributed Computing Core Engine

Simulates delivering notifications to users using four strategies:

  1. SEQUENTIAL    — One-by-one delivery (baseline)
  2. THREAD_POOL   — Parallel via ThreadPoolExecutor
  3. PROCESS_POOL  — Parallel via ProcessPoolExecutor
  4. GOSSIP        — Epidemic broadcast via peer-to-peer propagation

PDC Concepts Demonstrated:
  - Embarrassingly parallel workloads (thread/process pools)
  - Epidemic / gossip protocols (distributed systems)
  - Strong scaling, speedup, and parallel efficiency
  - Amdahl's Law: serial fraction measurement
  - Message overhead trade-offs (gossip vs direct)
  - Load balancing across workers
"""

from __future__ import annotations

import abc
import enum
import time
import random
import logging
import statistics
from typing import NamedTuple, Any
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from multiprocessing import cpu_count
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────

NOTIFICATION_TYPES = ["match", "like", "comment", "connect", "system", "mention"]

# Simulated delivery latency range in seconds (per notification to one user)
MIN_LATENCY = 0.005   # 5ms  — fast internal delivery
MAX_LATENCY = 0.050   # 50ms — slow external delivery

# Gossip parameters
GOSSIP_FANOUT = 3       # How many peers each node tells
GOSSIP_ROUNDS = 5       # Max propagation rounds


# ── Data Models ────────────────────────────────────────────────────────────

class Notification(NamedTuple):
    """A single notification to fan out."""
    id: int
    ntype: str
    sender_id: int
    content: str
    created_at: float

    @classmethod
    def generate(cls, nid: int) -> "Notification":
        return cls(
            id=nid,
            ntype=random.choice(NOTIFICATION_TYPES),
            sender_id=random.randint(0, 999),
            content=f"notif_{nid}",
            created_at=time.time(),
        )


@dataclass
class DeliveryReport:
    """Collected metrics for one delivery strategy run."""
    strategy_name: str
    total_time: float = 0.0    # Wall-clock time for all deliveries
    delivery_times: list[float] = field(default_factory=list)  # Per-notification latency
    user_recipient_count: list[int] = field(default_factory=list)  # How many users got each notif
    total_messages_sent: int = 0
    peak_workers: int = 0

    @property
    def mean_latency(self) -> float: return statistics.mean(self.delivery_times) if self.delivery_times else 0
    @property
    def p50_latency(self) -> float: return self._percentile(50)
    @property
    def p95_latency(self) -> float: return self._percentile(95)
    @property
    def p99_latency(self) -> float: return self._percentile(99)
    @property
    def throughput(self) -> float: return len(self.delivery_times) / self.total_time if self.total_time > 0 else 0
    @property
    def messages_per_notification(self) -> float: return self.total_messages_sent / max(len(self.delivery_times), 1)

    def _percentile(self, p: int) -> float:
        if not self.delivery_times:
            return 0
        sorted_t = sorted(self.delivery_times)
        idx = max(0, min(len(sorted_t) - 1, int(len(sorted_t) * p / 100)))
        return sorted_t[idx]


# ── Delivery Simulation ────────────────────────────────────────────────────

def simulate_delivery() -> float:
    """Simulate delivering one notification to one user.
    
    Returns the simulated latency in seconds.
    The latency follows a bimodal distribution:
    - ~70% of deliveries are "fast" (5-15ms)
    - ~30% are "slow" (20-50ms)
    This models real notification delivery where some channels are slow.
    """
    if random.random() < 0.7:
        return random.uniform(MIN_LATENCY, MIN_LATENCY * 3)
    return random.uniform(MIN_LATENCY * 4, MAX_LATENCY)


# ── Strategy Base ──────────────────────────────────────────────────────────

class Strategy(abc.ABC):
    """Abstract base for a delivery strategy."""

    def __init__(self, name: str):
        self.name = name

    @abc.abstractmethod
    def deliver(self, notifications: list[Notification], user_count: int) -> DeliveryReport:
        ...


# ── 1. SEQUENTIAL ──────────────────────────────────────────────────────────

class SequentialStrategy(Strategy):
    """Deliver each notification to all recipients one-by-one.
    
    Baseline strategy. No parallelism at all.
    PDC concept: Identifies the serial portion of the workload.
    """

    def __init__(self):
        super().__init__("SEQUENTIAL")

    def deliver(self, notifications: list[Notification], user_count: int) -> DeliveryReport:
        report = DeliveryReport(strategy_name=self.name)
        start = time.perf_counter()
        messages = 0

        for notif in notifications:
            for _ in range(user_count):
                latency = simulate_delivery()
                time.sleep(latency)
                report.delivery_times.append(latency)
                messages += 1

        report.total_time = time.perf_counter() - start
        report.total_messages_sent = messages
        report.peak_workers = 1
        report.user_recipient_count = [user_count] * len(notifications)
        return report


# ── 2. THREAD POOL ─────────────────────────────────────────────────────────

class ThreadPoolStrategy(Strategy):
    """Deliver via ThreadPoolExecutor — I/O-bound parallelism.
    
    Each notification fans out to all recipients concurrently using a thread pool.
    PDC concept: Embarrassingly parallel, thread safety, GIL implications.
    """

    def __init__(self, max_workers: int | None = None):
        super().__init__("THREAD_POOL")
        self.max_workers = max_workers or cpu_count()

    def deliver(self, notifications: list[Notification], user_count: int) -> DeliveryReport:
        report = DeliveryReport(strategy_name=self.name)
        start = time.perf_counter()
        messages = 0

        for notif in notifications:
            with ThreadPoolExecutor(max_workers=self.max_workers) as pool:
                futures = [pool.submit(simulate_delivery) for _ in range(user_count)]
                for f in as_completed(futures):
                    report.delivery_times.append(f.result())
                    messages += 1

        report.total_time = time.perf_counter() - start
        report.total_messages_sent = messages
        report.peak_workers = min(self.max_workers, user_count)
        report.user_recipient_count = [user_count] * len(notifications)
        return report


# ── 3. PROCESS POOL ────────────────────────────────────────────────────────

class ProcessPoolStrategy(Strategy):
    """Deliver via ProcessPoolExecutor — CPU-bound parallelism.
    
    Each notification fans out to recipients across separate processes.
    PDC concept: Bypasses GIL, true parallelism, IPC overhead.
    """

    def __init__(self, max_workers: int | None = None):
        super().__init__("PROCESS_POOL")
        self.max_workers = max_workers or cpu_count()

    def deliver(self, notifications: list[Notification], user_count: int) -> DeliveryReport:
        report = DeliveryReport(strategy_name=self.name)
        start = time.perf_counter()
        messages = 0

        for notif in notifications:
            with ProcessPoolExecutor(max_workers=self.max_workers) as pool:
                futures = [pool.submit(simulate_delivery) for _ in range(user_count)]
                for f in as_completed(futures):
                    report.delivery_times.append(f.result())
                    messages += 1

        report.total_time = time.perf_counter() - start
        report.total_messages_sent = messages
        report.peak_workers = min(self.max_workers, user_count)
        report.user_recipient_count = [user_count] * len(notifications)
        return report


# ── 4. GOSSIP ──────────────────────────────────────────────────────────────

class GossipStrategy(Strategy):
    """Deliver via epidemic / gossip protocol.
    
    Instead of delivering directly to all recipients, each notification
    starts at a few seed nodes who propagate to their peers. Each peer
    tells GOSSIP_FANOUT others, continuing for GOSSIP_ROUNDS.
    
    PDC concepts:
    - Epidemic/gossip protocols (used by DynamoDB, Cassandra, Bitcoin)
    - Message redundancy and overhead trade-off
    - Eventual consistency vs strong consistency
    - Infection rate and SIR model
    """

    def __init__(self, fanout: int = GOSSIP_FANOUT, max_rounds: int = GOSSIP_ROUNDS):
        super().__init__(f"GOSSIP (fanout={fanout})")
        self.fanout = fanout
        self.max_rounds = max_rounds

    def deliver(self, notifications: list[Notification], user_count: int) -> DeliveryReport:
        report = DeliveryReport(strategy_name=self.name)
        start = time.perf_counter()
        total_messages = 0

        for notif in notifications:
            # All users are nodes in the gossip network
            infected: set[int] = set()
            received: set[int] = set()

            # Step 1: Seed infection — deliver to GOSSIP_FANOUT random users
            seeds = random.sample(range(user_count), min(self.fanout, user_count))
            for seed in seeds:
                latency = simulate_delivery()
                time.sleep(latency)
                report.delivery_times.append(latency)
                infected.add(seed)
                received.add(seed)
                total_messages += 1

            # Step 2: Gossip propagation rounds
            for _round in range(self.max_rounds):
                new_infected: set[int] = set()
                for node in infected:
                    peers = random.sample(
                        [u for u in range(user_count) if u != node and u not in received],
                        min(self.fanout, user_count - len(received) - 1),
                    )
                    for peer in peers:
                        latency = simulate_delivery()
                        time.sleep(latency)
                        report.delivery_times.append(latency)
                        new_infected.add(peer)
                        received.add(peer)
                        total_messages += 1

                infected = new_infected
                if len(received) >= user_count:
                    break  # Everyone got it

            # Record how many users received this notification
            report.user_recipient_count.append(len(received))

        report.total_time = time.perf_counter() - start
        report.total_messages_sent = total_messages
        report.peak_workers = self.fanout
        return report


# ── Runner ─────────────────────────────────────────────────────────────────

STRATEGIES: dict[str, type[Strategy]] = {
    "sequential": SequentialStrategy,
    "thread": ThreadPoolStrategy,
    "process": ProcessPoolStrategy,
    "gossip": GossipStrategy,
}


def run_simulation(
    notification_count: int = 50,
    user_count: int = 100,
    strategies: list[str] | None = None,
    seed: int = 42,
) -> dict[str, DeliveryReport]:
    """Run the notification fanout simulation with specified strategies.
    
    Args:
        notification_count: How many notifications to fan out.
        user_count: How many recipients per notification.
        strategies: Which strategies to run. Defaults to all.
        seed: RNG seed for reproducibility.
    
    Returns:
        Dict mapping strategy name -> DeliveryReport
    """
    random.seed(seed)

    if strategies is None:
        strategies = list(STRATEGIES.keys())

    # Generate notifications
    notifications = [Notification.generate(i) for i in range(notification_count)]

    results: dict[str, DeliveryReport] = {}

    for name in strategies:
        strategy_cls = STRATEGIES.get(name)
        if strategy_cls is None:
            logger.warning("Unknown strategy: %s", name)
            continue

        strategy = strategy_cls()
        logger.info("Running %s (%d notifications, %d users)...", strategy.name, notification_count, user_count)
        t0 = time.perf_counter()
        report = strategy.deliver(notifications, user_count)
        elapsed = time.perf_counter() - t0
        results[name] = report

        logger.info(
            "  %s done in %.2fs | throughput=%.0f/s | p50=%.1fms p95=%.1fms p99=%.1fms | msgs=%d",
            strategy.name, report.total_time,
            report.throughput,
            report.p50_latency * 1000, report.p95_latency * 1000, report.p99_latency * 1000,
            report.total_messages_sent,
        )

    return results


def compute_speedups(results: dict[str, DeliveryReport]) -> dict[str, float]:
    """Compute speedup relative to sequential baseline."""
    baseline = results.get("sequential")
    if not baseline or baseline.total_time == 0:
        return {}
    return {name: baseline.total_time / r.total_time for name, r in results.items()}


def print_report(results: dict[str, DeliveryReport]) -> None:
    """Print a formatted comparison table."""
    speedups = compute_speedups(results)

    print()
    print("=" * 100)
    header = f"{'Strategy':<25} {'Time(s)':<10} {'Throughput/s':<14} {'P50(ms)':<10} {'P95(ms)':<10} {'P99(ms)':<10} {'Speedup':<10} {'Msg/Notif':<10}"
    print(header)
    print("=" * 100)

    for name, r in results.items():
        spd = speedups.get(name, 1.0)
        print(f"{r.strategy_name:<25} {r.total_time:<10.3f} {r.throughput:<14.1f} {r.p50_latency*1000:<10.1f} {r.p95_latency*1000:<10.1f} {r.p99_latency*1000:<10.1f} {spd:<10.2f}x {r.messages_per_notification:<10.1f}")

    print("=" * 100)
    if speedups:
        baseline = results.get("sequential")
        if baseline:
            fastest = max(speedups.items(), key=lambda x: x[1])
            print(f"\n  Best speedup: {fastest[0]} with {fastest[1]:.2f}x (sequential: {baseline.total_time:.2f}s)")
    print()


# ── CLI Entry Point ────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    results = run_simulation(notification_count=50, user_count=100)
    print_report(results)
