"""
Notification Fanout — Visualization Module

Generates 6 publication-quality plots comparing fanout strategies.
"""

from __future__ import annotations

import os
import warnings
import numpy as np
from simulation import DeliveryReport

warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

# ── Style ──────────────────────────────────────────────────────────────────

plt.rcParams.update({
    "figure.dpi": 150,
    "savefig.dpi": 150,
    "savefig.bbox": "tight",
    "font.size": 11,
    "axes.titlesize": 14,
    "axes.labelsize": 12,
    "legend.fontsize": 10,
})

STRATEGY_COLORS = {
    "sequential": "#6C757D",
    "thread": "#0D6EFD",
    "process": "#198754",
    "gossip": "#DC3545",
}

STRATEGY_LABELS = {
    "sequential": "Sequential",
    "thread": "Thread Pool",
    "process": "Process Pool",
    "gossip": "Gossip",
}

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")


def save(name: str):
    """Save a figure to the results directory."""
    path = os.path.join(RESULTS_DIR, name)
    plt.savefig(path)
    plt.close()
    print(f"  [OK] {name}")


# ── Plot 1: Latency CDF ────────────────────────────────────────────────────

def plot_latency_cdf(results: dict[str, DeliveryReport]) -> None:
    """Cumulative distribution of per-delivery latencies."""
    fig, ax = plt.subplots(figsize=(10, 7))

    for name, report in results.items():
        if not report.delivery_times:
            continue
        sorted_t = np.sort(report.delivery_times)
        cdf = np.arange(1, len(sorted_t) + 1) / len(sorted_t)
        ax.plot(sorted_t * 1000, cdf, label=STRATEGY_LABELS.get(name, name),
                color=STRATEGY_COLORS.get(name), linewidth=2)

    ax.set_xlabel("Per-Delivery Latency (ms)")
    ax.set_ylabel("Cumulative Probability")
    ax.set_title("Latency CDF by Fanout Strategy")
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)
    ax.set_xlim(left=0)

    # Mark P50, P95, P99 reference lines
    for p, ls, color in [(0.5, "--", "#FFC107"), (0.95, ":", "#FD7E14"), (0.99, "-.", "#DC3545")]:
        ax.axhline(y=p, color=color, linestyle=ls, alpha=0.4, linewidth=1)
        ax.text(ax.get_xlim()[1] * 0.95, p + 0.02, f"P{int(p*100)}", color=color, fontsize=9, ha="right")

    plt.tight_layout()
    save("01_latency_cdf.png")


# ── Plot 2: Speedup Bar Chart ──────────────────────────────────────────────

def plot_speedup(results: dict[str, DeliveryReport]) -> None:
    """Speedup relative to sequential baseline."""
    baseline = results.get("sequential")
    if not baseline or baseline.total_time == 0:
        return

    names = [n for n in results if n != "sequential"]
    speedups = [baseline.total_time / results[n].total_time for n in names]
    times = [results[n].total_time for n in names]
    colors = [STRATEGY_COLORS.get(n, "#6C757D") for n in names]
    labels = [STRATEGY_LABELS.get(n, n) for n in names]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

    # Bar: Total time
    bars = ax1.bar(range(len(names)), times, color=colors, edgecolor="white", width=0.6)
    for bar, t in zip(bars, times):
        ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
                 f"{t:.2f}s", ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax1.set_xticks(range(len(names)))
    ax1.set_xticklabels(labels, rotation=20, ha="right")
    ax1.set_ylabel("Total Time (seconds)")
    ax1.set_title("Total Delivery Time")
    ax1.grid(True, alpha=0.3, axis="y")

    # Bar: Speedup
    bars2 = ax2.bar(range(len(names)), speedups, color=colors, edgecolor="white", width=0.6)
    for bar, spd in zip(bars2, speedups):
        ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.05,
                 f"{spd:.2f}x", ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax2.axhline(y=1.0, color="red", linestyle="--", alpha=0.5, label="Sequential baseline")
    ax2.set_xticks(range(len(names)))
    ax2.set_xticklabels(labels, rotation=20, ha="right")
    ax2.set_ylabel("Speedup (× Sequential)")
    ax2.set_title("Speedup vs Sequential")
    ax2.legend()
    ax2.grid(True, alpha=0.3, axis="y")

    plt.tight_layout()
    save("02_speedup.png")


# ── Plot 3: Throughput Comparison ──────────────────────────────────────────

def plot_throughput(results: dict[str, DeliveryReport]) -> None:
    """Throughput (deliveries/second) comparison."""
    names = list(results.keys())
    throughputs = [results[n].throughput for n in names]
    colors = [STRATEGY_COLORS.get(n, "#6C757D") for n in names]
    labels = [STRATEGY_LABELS.get(n, n) for n in names]

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.bar(range(len(names)), throughputs, color=colors, edgecolor="white", width=0.6)

    for bar, t in zip(bars, throughputs):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(throughputs) * 0.01,
                 f"{t:.0f}/s", ha="center", va="bottom", fontsize=10, fontweight="bold")

    ax.set_xticks(range(len(names)))
    ax.set_xticklabels(labels, rotation=20, ha="right")
    ax.set_ylabel("Throughput (deliveries / second)")
    ax.set_title("Notification Delivery Throughput by Strategy")
    ax.grid(True, alpha=0.3, axis="y")
    plt.tight_layout()
    save("03_throughput.png")


# ── Plot 4: Message Overhead ───────────────────────────────────────────────

def plot_message_overhead(results: dict[str, DeliveryReport]) -> None:
    """Total messages sent per strategy."""
    names = list(results.keys())
    msgs = [results[n].total_messages_sent for n in names]
    expected = msgs[0] if names else 1  # Sequential sends exact = user_count * notification_count
    overhead_pcts = [(m / expected - 1) * 100 for m in msgs]
    colors = [STRATEGY_COLORS.get(n, "#6C757D") for n in names]
    labels = [STRATEGY_LABELS.get(n, n) for n in names]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

    # Absolute messages
    bars1 = ax1.bar(range(len(names)), msgs, color=colors, edgecolor="white", width=0.6)
    for bar, m in zip(bars1, msgs):
        ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(msgs) * 0.005,
                 f"{m:,}", ha="center", va="bottom", fontsize=9, fontweight="bold")
    ax1.set_xticks(range(len(names)))
    ax1.set_xticklabels(labels, rotation=20, ha="right")
    ax1.set_ylabel("Total Messages Sent")
    ax1.set_title("Message Volume")
    ax1.grid(True, alpha=0.3, axis="y")

    # Overhead percentage
    bars2 = ax2.bar(range(len(names)), overhead_pcts, color=colors, edgecolor="white", width=0.6)
    for bar, pct in zip(bars2, overhead_pcts):
        ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(overhead_pcts) * 0.01,
                 f"{pct:+.1f}%", ha="center", va="bottom", fontsize=9, fontweight="bold")
    ax2.axhline(y=0, color="red", linestyle="--", alpha=0.5, label="Baseline (0%)")
    ax2.set_xticks(range(len(names)))
    ax2.set_xticklabels(labels, rotation=20, ha="right")
    ax2.set_ylabel("Overhead vs Sequential (%)")
    ax2.set_title("Message Overhead")
    ax2.legend()
    ax2.grid(True, alpha=0.3, axis="y")

    plt.tight_layout()
    save("04_message_overhead.png")


# ── Plot 5: Scalability Analysis ───────────────────────────────────────────

def plot_scalability(results: dict[str, DeliveryReport]) -> None:
    """Worker utilization and efficiency."""
    names = [n for n in results if n != "sequential"]
    labels = [STRATEGY_LABELS.get(n, n) for n in names]
    colors = [STRATEGY_COLORS.get(n) for n in names]

    fig, ax = plt.subplots(figsize=(10, 6))

    baseline_time = results.get("sequential")
    if not baseline_time:
        return

    x = np.arange(len(names))
    width = 0.35

    # Parallel efficiency = speedup / ideal_speedup
    for i, name in enumerate(names):
        report = results[name]
        ideal = max(report.peak_workers, 1)
        actual_speedup = baseline_time.total_time / report.total_time
        efficiency = min(actual_speedup / ideal * 100, 1000)

        ax.bar(i, efficiency, width, color=colors[i], edgecolor="white", alpha=0.8)
        ax.text(i, efficiency + 1, f"{efficiency:.1f}%", ha="center", va="bottom", fontsize=9, fontweight="bold")

    ax.set_xticks(range(len(names)))
    ax.set_xticklabels(labels, rotation=20, ha="right")
    ax.set_ylabel("Parallel Efficiency (%)")
    ax.set_title("Parallel Efficiency (Speedup / Ideal Speedup × 100)")
    ax.axhline(y=100, color="green", linestyle="--", alpha=0.4, label="Ideal (100%)")
    ax.legend()
    ax.grid(True, alpha=0.3, axis="y")
    ax.set_ylim(0, 110)

    plt.tight_layout()
    save("05_efficiency.png")


# ── Plot 6: Scalability with User Count ────────────────────────────────────

def plot_scaling_with_users(
    results_by_user_count: dict[int, dict[str, DeliveryReport]]
) -> None:
    """Show how each strategy scales as the user base grows."""
    fig, ax = plt.subplots(figsize=(10, 7))

    user_counts = sorted(results_by_user_count.keys())
    strategy_names = list(next(iter(results_by_user_count.values())).keys())

    for name in strategy_names:
        times = [results_by_user_count[uc][name].total_time for uc in user_counts]
        ax.plot(user_counts, times, "o-", label=STRATEGY_LABELS.get(name, name),
                color=STRATEGY_COLORS.get(name), linewidth=2, markersize=6)

    ax.set_xlabel("Number of Recipient Users")
    ax.set_ylabel("Total Delivery Time (s)")
    ax.set_title("Scaling Behavior: Delivery Time vs User Count")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    save("06_scaling.png")


# ── Plot 7: Delivery Coverage (Gossip) ─────────────────────────────────────

def plot_gossip_coverage(report: DeliveryReport) -> None:
    """Show how many users were reached per notification via gossip."""
    if not report.user_recipient_count:
        return

    fig, ax = plt.subplots(figsize=(10, 6))
    counts = report.user_recipient_count
    ax.hist(counts, bins=min(20, max(counts) - min(counts) + 1),
            color=STRATEGY_COLORS["gossip"], alpha=0.7, edgecolor="white")
    ax.axvline(x=np.mean(counts), color="darkred", linestyle="--", linewidth=2,
               label=f"Mean: {np.mean(counts):.0f} users")
    ax.set_xlabel("Users Reached per Notification")
    ax.set_ylabel("Frequency")
    ax.set_title("Gossip Delivery Coverage (Users Reached per Notification)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    save("07_gossip_coverage.png")


# ── Master Plotter ─────────────────────────────────────────────────────────

def generate_all_plots(results: dict[str, DeliveryReport]) -> None:
    """Generate all standard comparison plots."""
    print("\n[Generating plots...]")
    plot_latency_cdf(results)
    plot_speedup(results)
    plot_throughput(results)
    plot_message_overhead(results)
    plot_scalability(results)

    if "gossip" in results:
        plot_gossip_coverage(results["gossip"])

    print(f"   All plots saved to: {RESULTS_DIR}")
