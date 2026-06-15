# Collabryx PDC Lab — Setup & Run Guide

> **Parallel & Distributed Computing**: User Segmentation & Clustering with Jupyter Notebook

---

## Table of Contents

1. [Clone the Repository](#1-clone-the-repository)
2. [Prerequisites Installation](#2-prerequisites-installation)
3. [Install Python Packages](#3-install-python-packages)
4. [Launch & Run the Notebook](#4-launch--run-the-notebook)
5. [How It Works (Quick Summary)](#5-how-it-works-quick-summary)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Clone the Repository

Open a terminal and run:

```powershell
git clone <your-repo-url>
cd D:\Projects\collabryx
```

If you don't have the repo URL yet:

```powershell
# Or copy the project if already local
cd D:\Projects\collabryx
```

The PDC lab lives in the `pdc/` subdirectory:

```
collabryx/
├── pdc/                                    ← PDC Lab
│   ├── user_segmentation_clustering.ipynb  ← The notebook
│   ├── generate_notebook.py                ← Creates the .ipynb
│   └── MANUAL.md                           ← This file
├── .env                                    ← Required! DB credentials
└── ...
```

---

## 2. Prerequisites Installation

### 2.1 Install Python (3.9+)

**Windows:**

```powershell
# Option A: Download from python.org
# Option B: winget
winget install Python.Python.3.14
```

**macOS:**

```bash
brew install python@3.14
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt update && sudo apt install python3 python3-pip python3-venv -y
```

Verify:

```powershell
python --version
pip --version
```

### 2.2 Install Jupyter Notebook

```powershell
pip install jupyter notebook nbconvert ipykernel
```

Verify:

```powershell
jupyter --version
```

> If `jupyter` is not found, add the Scripts folder to PATH:
> ```powershell
> $env:Path += ";C:\Users\$env:USERNAME\AppData\Local\Python\Python314\Scripts"
> ```

---

## 3. Install Python Packages

Install all required packages in one command:

```powershell
pip install scikit-learn matplotlib seaborn pandas numpy python-dotenv joblib supabase
```

| Package | Purpose |
|---------|---------|
| `scikit-learn` | K-Means, PCA, t-SNE, StandardScaler |
| `matplotlib` | All plots (10 visualizations) |
| `seaborn` | Heatmap & styling |
| `pandas` | DataFrames, groupby, aggregation |
| `numpy` | Array operations, matrix math |
| `python-dotenv` | Load `.env` for DB credentials |
| `joblib` | Parallel processing across CPU cores |
| `supabase` | Fetch data from the database |

Verify all packages:

```powershell
python -c "import numpy, pandas, sklearn, matplotlib, seaborn, joblib, dotenv, supabase; print('All OK')"
```

---

## 4. Launch & Run the Notebook

### Step 1: Ensure `.env` exists

The notebook reads database credentials from the project root `.env` file.

Check that `D:\Projects\collabryx\.env` contains these keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://fwmlglizkkkwldoyujwl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Step 2: Navigate to the PDC directory

```powershell
cd D:\Projects\collabryx\pdc
```

### Step 3: (Optional) Regenerate the notebook

Only needed if you modified the generator:

```powershell
python generate_notebook.py
```

### Step 4: Launch Jupyter

```powershell
jupyter notebook
```

Your browser opens showing the file list.

### Step 5: Open & run

1. Click `user_segmentation_clustering.ipynb`
2. From the menu: **Run** → **Run All Cells**
3. Watch the output — the notebook fetches data, processes it in parallel across all CPU cores, and displays 10 plots inline

### Expected runtime: ~15-30 seconds

| Cell | What It Does | Time |
|------|-------------|------|
| Imports | Loads all Python libraries | ~2s |
| Parallel DB fetch | Fetches 6 tables concurrently via ThreadPoolExecutor | ~1-3s |
| Parallel feature engineering | Aggregates skills/interests/engagement across CPU cores | ~2-5s |
| PCA | Dimensionality reduction | ~0.5s |
| Parallel K-Means | Tests K=2..15 across all cores simultaneously | ~3-8s |
| Final clustering + t-SNE | Fits optimal K, computes t-SNE | ~3-10s |
| 10 plots | PCA scatter, t-SNE, elbow, sizes, radar, heatmap, boxplots, etc. | ~1-2s each |

---

## 5. How It Works (Quick Summary)

The notebook connects to the live Collabryx Supabase database and:

1. **Fetches** 1,000+ user profiles, skills, interests, connections, posts, and matches — all 6 tables fetched **in parallel** over HTTP
2. **Builds a 92-feature matrix** per user (skills, interests, location, university, engagement metrics) — aggregation distributed across **all CPU cores** via `joblib.Parallel`
3. **Reduces dimensions** with PCA to 20 components
4. **Finds optimal K** by running 14 K-Means models (K=2..15) **in parallel** — picks the one with highest silhouette score
5. **Clusters** users into 3 segments using the optimal K
6. **Renders 10 plots** inline: PCA scatter, t-SNE, elbow curve, cluster sizes, radar chart, skill heatmap, engagement boxplots, collaboration readiness, location distribution, parallel coordinates

---

## 6. Troubleshooting

### jupyter: command not found

```powershell
$env:Path += ";C:\Users\$env:USERNAME\AppData\Local\Python\Python314\Scripts"
```

### Module not found: sklearn / matplotlib / etc.

```powershell
pip install scikit-learn matplotlib seaborn pandas numpy python-dotenv joblib supabase
```

### Supabase connection error

- Ensure `.env` exists in the project root with valid `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check internet connectivity
- Verify the service role key hasn't expired

### Plot 10 crashes with "cluster" column error

Regenerate the notebook (compatibility fix included):

```powershell
python generate_notebook.py
```

---

*Collabryx PDC Lab — June 2026*
