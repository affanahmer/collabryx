# Notification Fanout — Parallel & Distributed Computing Demo

Simulates delivering notifications to users using four different fanout strategies and compares their performance, scalability, and overhead.

---

## 🧠 PDC Concepts Demonstrated

| Concept | Where |
|---------|-------|
| **Embarrassingly parallel** | Thread pool & process pool deliver to all recipients simultaneously |
| **Amdahl's Law / Strong scaling** | Speedup measured relative to sequential baseline |
| **Parallel efficiency** | Speedup ÷ ideal speedup × 100 (measured in plots) |
| **Gossip / epidemic protocol** | Peer-to-peer propagation (used by DynamoDB, Cassandra, Bitcoin) |
| **Message overhead trade-off** | Gossip sends more total messages than direct delivery |
| **Load balancing** | Worker pools distribute delivery across available cores |
| **IPC overhead** | Process pool vs thread pool comparison shows cross-process cost |

---

## 🏗️ Project Structure

```
notification_fanout/
├── run.py              CLI entry point
├── simulation.py       Core engine — strategies + metrics
├── plots.py            Visualization — 7 publication-quality plots
├── README.md           This file
├── requirements.txt    Dependencies
├── data/               Generated notification datasets
└── results/            Generated PNG plots
```

---

## ⚙️ Strategies

| Strategy | Description | PDC Insight |
|----------|-------------|-------------|
| **SEQUENTIAL** | Deliver one-by-one | Baseline — identifies serial fraction |
| **THREAD_POOL** | Concurrent via `ThreadPoolExecutor` | I/O-bound parallelism; GIL doesn't block I/O waits |
| **PROCESS_POOL** | Concurrent via `ProcessPoolExecutor` | True CPU parallelism; IPC overhead cost |
| **GOSSIP** | Epidemic broadcast to peers | Eventual consistency; redundant messages trade speed for reliability |

---

## 🚀 Quick Start

```powershell
cd pdc/notification_fanout

# Install
pip install -r requirements.txt

# Run default simulation (50 notifications, 100 users, all strategies)
python run.py

# Custom run
python run.py --notifications 100 --users 500

# Scaling analysis (sweeps user counts: 10 → 25 → 50 → 100 → 200 → 500)
python run.py --scale

# Gossip deep dive
python run.py --gossip-only --users 1000

# No plots (CLI only)
python run.py --no-plots
```

---

## 📊 Plots Generated (in `results/`)

| File | What It Shows |
|------|---------------|
| `01_latency_cdf.png` | Cumulative distribution of per-delivery latency — P50/P95/P99 markers |
| `02_speedup.png` | Total time + speedup vs sequential (bar chart) |
| `03_throughput.png` | Deliveries per second per strategy |
| `04_message_overhead.png` | Total messages sent + overhead % vs sequential |
| `05_efficiency.png` | Parallel efficiency (speedup ÷ ideal × 100) |
| `06_scaling.png` | Delivery time vs user count — shows how each strategy scales |
| `07_gossip_coverage.png` | Users reached per notification under gossip |

---

## 📈 Expected Results

```
                          Time(s)   Throughput/s   P50(ms)   P95(ms)   P99(ms)   Speedup   Msg/Notif
SEQUENTIAL                 ~5.0s         ~1000         ~8       ~40       ~48       1.00x       100
THREAD_POOL                ~0.1s       ~50000         ~8       ~40       ~48      50.0x       100
PROCESS_POOL               ~0.1s       ~50000         ~8       ~40       ~48      50.0x       100
GOSSIP                     ~0.3s       ~17000         ~8       ~40       ~48      16.0x        ~310
```

- **Thread pool ≈ Process pool** for I/O-bound work (sleep = I/O wait)
- **Gossip is slower** but reaches all users with fewer direct connections
- **Gossip sends ~3× more messages** but provides redundancy and fault tolerance
- **Efficiency drops** as cores increase (Amdahl's Law — serial fraction limits speedup)

---

## 🔬 Collabryx Connection

This simulates the real notification delivery system in Collabryx:

```
Collabryx production:  notification-service → HTTP POST to N users
Our simulation:        ThreadPoolExecutor → simulate_delivery() × N users
```

The real `notification-service` at `python-worker/notification-service/` does the same fan-out pattern. This project lets you explore the **scaling behavior** and **strategy trade-offs** without touching production.
