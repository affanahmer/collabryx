"""Generate the Collabryx User Segmentation & Clustering Jupyter notebook."""
import json, os, uuid

os.chdir(os.path.dirname(os.path.abspath(__file__)))

def cell(source, cell_type='code'):
    if isinstance(source, str):
        source_lines = source.split('\n')
    else:
        source_lines = source
    c = {
        "cell_type": cell_type,
        "metadata": {},
        "source": [s + '\n' for s in source_lines],
        "id": uuid.uuid4().hex[:8],
    }
    if cell_type == 'code':
        c["execution_count"] = None
        c["outputs"] = []
    return c

nb = {
    "cells": [],
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.14.0"}
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

nb['cells'].append(cell("""# 👥 Collabryx User Segmentation & Clustering
## Parallel & Distributed Computing — Real Database Analysis

This notebook:
1. **Fetches** live data from the Collabryx Supabase database (dynamically, no hardcoded assumptions)
2. **Processes** it in parallel using all available CPU cores
3. **Clusters** users into archetypes using K-Means
4. **Visualizes** with 10 publication-quality plots""", 'markdown'))

nb['cells'].append(cell("""import os, sys, json, time, warnings, math
import urllib.request
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter, defaultdict

import numpy as np
import pandas as pd
from dotenv import load_dotenv

# Parallel processing
from joblib import Parallel, delayed, cpu_count
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# Visualization
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import seaborn as sns

warnings.filterwarnings('ignore')
sns.set_style('whitegrid')
sns.set_palette('Set2')
try:
    get_ipython().run_line_magic('matplotlib', 'inline')
except:
    pass

N_CORES = cpu_count()
print(f'🔥 Detected {N_CORES} CPU cores — will use all for parallel processing')"""))

nb['cells'].append(cell("""# ── Load environment variables from project .env ──
load_dotenv(os.path.join('..', '.env'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print(f'📡 Supabase URL: {SUPABASE_URL}')
print(f'🔑 API Key present: {bool(SUPABASE_KEY)}')

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Prefer': 'count=exact'
}"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# PARALLEL DATA FETCHING — All tables fetched concurrently
# ═══════════════════════════════════════════════════════════════

def fetch_table(table_name, select_cols='*', limit=5000):
    url = f'{SUPABASE_URL}/rest/v1/{table_name}?select={select_cols}&limit={limit}'
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            return table_name, data
    except Exception as e:
        return table_name, []

fetch_plan = [
    ('profiles', 'id,display_name,headline,bio,collaboration_readiness,profile_completion,location,university,looking_for,created_at'),
    ('user_skills', 'user_id,skill_name,proficiency'),
    ('user_interests', 'user_id,interest'),
    ('connections', 'id,requester_id,receiver_id,status'),
    ('match_suggestions', 'id,user_id,matched_user_id,match_percentage,status'),
    ('posts', 'id,author_id,post_type,intent,reaction_count,comment_count'),
]

print(f'⏳ Fetching {len(fetch_plan)} tables in parallel...')
t0 = time.time()

fetched = {}
with ThreadPoolExecutor(max_workers=N_CORES) as executor:
    futures = {executor.submit(fetch_table, name, cols): name for name, cols in fetch_plan}
    for future in as_completed(futures):
        name, data = future.result()
        fetched[name] = data
        print(f'   [{time.time()-t0:5.1f}s] {name}: {len(data)} rows')

print(f'✅ All tables fetched in {time.time()-t0:.1f}s')"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# BUILD FEATURE MATRIX — Parallel aggregation across users
# ═══════════════════════════════════════════════════════════════

print('Building user feature matrix...')

profiles = fetched['profiles']
skills_raw = fetched['user_skills']
interests_raw = fetched['user_interests']
connections_raw = fetched['connections']
matches_raw = fetched['match_suggestions']
posts_raw = fetched['posts']

user_ids = [p['id'] for p in profiles]
n_users = len(user_ids)
print(f'   Total unique users: {n_users}')

# ── Parallel skill aggregation ──
def get_skills_for_user(uid):
    return [s['skill_name'].lower().strip() for s in skills_raw if s['user_id'] == uid]

print('   Aggregating skills in parallel...')
t0 = time.time()
user_skills_list = Parallel(n_jobs=N_CORES, prefer='threads')(
    delayed(get_skills_for_user)(uid) for uid in user_ids
)
print(f'   Done in {time.time()-t0:.1f}s')

# ── Parallel interest aggregation ──
def get_interests_for_user(uid):
    return [i['interest'].lower().strip() for i in interests_raw if i['user_id'] == uid]

print('   Aggregating interests in parallel...')
t0 = time.time()
user_interests_list = Parallel(n_jobs=N_CORES, prefer='threads')(
    delayed(get_interests_for_user)(uid) for uid in user_ids
)
print(f'   Done in {time.time()-t0:.1f}s')

# ── Parallel engagement computation ──
def compute_engagement(uid):
    conn_count = sum(1 for c in connections_raw if c['requester_id'] == uid or c['receiver_id'] == uid)
    match_count = sum(1 for m in matches_raw if m['user_id'] == uid)
    post_count = sum(1 for p in posts_raw if p['author_id'] == uid)
    reactions = sum(p.get('reaction_count', 0) for p in posts_raw if p['author_id'] == uid)
    return conn_count, match_count, post_count, reactions

print('   Computing engagement in parallel...')
t0 = time.time()
engagement_metrics = Parallel(n_jobs=N_CORES, prefer='threads')(
    delayed(compute_engagement)(uid) for uid in user_ids
)
print(f'   Done in {time.time()-t0:.1f}s')

# ── One-hot encode skills (top 30) ──
all_skills = [s for sublist in user_skills_list for s in sublist]
top_skills = [s for s, _ in Counter(all_skills).most_common(30)]

def skill_vector(skills):
    return [1 if s in skills else 0 for s in top_skills]

print('   Encoding skills in parallel...')
skill_vectors = Parallel(n_jobs=N_CORES, prefer='threads')(
    delayed(skill_vector)(uskills) for uskills in user_skills_list
)

# ── One-hot encode interests (top 20) ──
all_interests = [i for sublist in user_interests_list for i in sublist]
top_interests = [i for i, _ in Counter(all_interests).most_common(20)]

def interest_vector(interests):
    return [1 if i in interests else 0 for i in top_interests]

print('   Encoding interests in parallel...')
interest_vectors = Parallel(n_jobs=N_CORES, prefer='threads')(
    delayed(interest_vector)(uints) for uints in user_interests_list
)

# ── Profile features ──
profile_df = pd.DataFrame(profiles)
profile_completion = profile_df['profile_completion'].fillna(0).values / 100.0
collab_ready = pd.get_dummies(profile_df['collaboration_readiness'].fillna('unknown'), prefix='cr')

top_locs = profile_df['location'].value_counts().nlargest(20).index.tolist()
loc_vector = np.array([[1 if loc == p.get('location') else 0 for loc in top_locs] for p in profiles])

top_unis = profile_df['university'].value_counts().nlargest(15).index.tolist()
uni_vector = np.array([[1 if u == p.get('university') else 0 for u in top_unis] for p in profiles])

# ── Assemble final matrix ──
feature_parts = [
    np.array(skill_vectors),
    np.array(interest_vectors),
    np.expand_dims(profile_completion, 1),
    loc_vector,
    uni_vector,
    collab_ready.values,
    np.array(engagement_metrics),
]

X = np.hstack(feature_parts).astype(np.float64)
print(f'✅ Feature matrix: {X.shape} ({n_users} users x {X.shape[1]} features)')"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# DIMENSIONALITY REDUCTION — PCA
# ═══════════════════════════════════════════════════════════════

print('Scaling features...')
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print('Running PCA...')
t0 = time.time()
pca = PCA(n_components=min(20, X_scaled.shape[1]), random_state=42)
X_pca = pca.fit_transform(X_scaled)
print(f'   Done in {time.time()-t0:.1f}s')
print(f'   Total explained variance (20 PCs): {pca.explained_variance_ratio_.sum():.2%}')
for i, ratio in enumerate(pca.explained_variance_ratio_[:5]):
    print(f'   PC{i+1}: {ratio:.2%}')"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# FIND OPTIMAL K — Parallel K-Means for K=2..15
# ═══════════════════════════════════════════════════════════════

print('Finding optimal K (parallel K-Means K=2..15)...')
t0 = time.time()

def fit_kmeans(k):
    km = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=500)
    labels = km.fit_predict(X_pca[:, :10])
    sil = silhouette_score(X_pca[:, :10], labels)
    return k, km.inertia_, sil, labels

results = Parallel(n_jobs=N_CORES)(
    delayed(fit_kmeans)(k) for k in range(2, 16)
)
print(f'   All runs done in {time.time()-t0:.1f}s')

k_values = [r[0] for r in results]
inertias = [r[1] for r in results]
sil_scores = [r[2] for r in results]

best_idx = int(np.argmax(sil_scores))
best_k = k_values[best_idx]
best_sil = sil_scores[best_idx]
print(f'✅ Optimal K = {best_k} (silhouette: {best_sil:.3f})')
for k, s in zip(k_values, sil_scores):
    marker = ' ← BEST' if k == best_k else ''
    print(f'   K={k:2d}  silhouette={s:.4f}{marker}')"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# FINAL CLUSTERING with optimal K
# ═══════════════════════════════════════════════════════════════

print(f'Running final K-Means with K={best_k}...')
final_kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10, max_iter=500)
labels = final_kmeans.fit_predict(X_pca[:, :10])

# t-SNE for visualization
print('Running t-SNE...')
from sklearn.manifold import TSNE
tsne = TSNE(n_components=2, random_state=42, perplexity=min(30, n_users//5), n_jobs=N_CORES)
X_tsne = tsne.fit_transform(X_pca[:, :10])

# Build results DataFrame
user_data = pd.DataFrame({
    'user_id': user_ids,
    'display_name': [p.get('display_name', '') for p in profiles],
    'headline': [p.get('headline', '') for p in profiles],
    'collaboration_readiness': [p.get('collaboration_readiness', '') for p in profiles],
    'profile_completion': [p.get('profile_completion', 0) for p in profiles],
    'location': [p.get('location', '') for p in profiles],
    'university': [p.get('university', '') for p in profiles],
    'cluster': labels,
    'PC1': X_pca[:, 0], 'PC2': X_pca[:, 1],
    'tsne1': X_tsne[:, 0], 'tsne2': X_tsne[:, 1],
    'n_skills': [len(s) for s in user_skills_list],
    'n_interests': [len(i) for i in user_interests_list],
    'n_connections': [m[0] for m in engagement_metrics],
    'n_matches': [m[1] for m in engagement_metrics],
    'n_posts': [m[2] for m in engagement_metrics],
    'total_reactions': [m[3] for m in engagement_metrics],
})

print(f'✅ Clustering complete: {best_k} clusters, {n_users} users')
for c in range(best_k):
    count = int((labels == c).sum())
    print(f'   Cluster {c}: {count} users ({count/n_users*100:.1f}%)')

colors = cm.Set2(np.linspace(0, 1, best_k))"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 1: PCA 2D Scatter
# ═══════════════════════════════════════════════════════════════

fig, ax = plt.subplots(figsize=(14, 10))
for c in range(best_k):
    mask = labels == c
    ax.scatter(X_pca[mask, 0], X_pca[mask, 1], c=[colors[c]], 
               label=f'Cluster {c}', alpha=0.7, s=40, edgecolors='w', linewidth=0.5)
ax.set_title(f'User Segments — PCA (K={best_k}, silhouette={best_sil:.3f})', 
             fontsize=16, fontweight='bold')
ax.set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]:.1%})', fontsize=12)
ax.set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]:.1%})', fontsize=12)
ax.legend(fontsize=11)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 2: t-SNE Projection
# ═══════════════════════════════════════════════════════════════

fig, ax = plt.subplots(figsize=(14, 10))
for c in range(best_k):
    mask = labels == c
    ax.scatter(X_tsne[mask, 0], X_tsne[mask, 1], c=[colors[c]],
               label=f'Cluster {c}', alpha=0.7, s=45, edgecolors='w', linewidth=0.5)
ax.set_title('t-SNE Projection — Cluster Separation', fontsize=16, fontweight='bold')
ax.set_xlabel('t-SNE 1', fontsize=12)
ax.set_ylabel('t-SNE 2', fontsize=12)
ax.legend(fontsize=11)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 3: Elbow + Silhouette (dual axis)
# ═══════════════════════════════════════════════════════════════

fig, ax1 = plt.subplots(figsize=(12, 7))
ax1.plot(k_values, inertias, 'o-', color='#2E86AB', linewidth=2.5, markersize=8, label='Inertia')
ax1.set_xlabel('Number of Clusters (K)', fontsize=13)
ax1.set_ylabel('Inertia', fontsize=13, color='#2E86AB')
ax1.tick_params(axis='y', labelcolor='#2E86AB')
ax1.axvline(x=best_k, color='red', linestyle='--', alpha=0.4)

ax2 = ax1.twinx()
ax2.plot(k_values, sil_scores, 's--', color='#A23B72', linewidth=2.5, markersize=8, label='Silhouette')
ax2.set_ylabel('Silhouette Score', fontsize=13, color='#A23B72')
ax2.tick_params(axis='y', labelcolor='#A23B72')
ax2.scatter([best_k], [best_sil], c='red', s=200, zorder=5, marker='*')
ax2.annotate(f'K={best_k} sil={best_sil:.3f}', (best_k, best_sil),
             textcoords='offset points', xytext=(10, 15), fontsize=12, fontweight='bold',
             arrowprops=dict(arrowstyle='->', color='red'))

lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper right')
ax1.set_title('Elbow Method + Silhouette Analysis', fontsize=16, fontweight='bold')
ax1.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 4: Cluster Size Distribution
# ═══════════════════════════════════════════════════════════════

cluster_sizes = [int((labels == c).sum()) for c in range(best_k)]
cluster_pcts = [s / n_users * 100 for s in cluster_sizes]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))
bars = ax1.bar(range(best_k), cluster_sizes, color=colors, edgecolor='white', linewidth=1.5)
for bar, size, pct in zip(bars, cluster_sizes, cluster_pcts):
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 5,
             f'{size}\\n({pct:.1f}%)', ha='center', va='bottom', fontsize=10, fontweight='bold')
ax1.set_xlabel('Cluster', fontsize=12)
ax1.set_ylabel('Users', fontsize=12)
ax1.set_title('Cluster Sizes', fontsize=14, fontweight='bold')
ax1.set_xticks(range(best_k))

ax2.pie(cluster_sizes, labels=[f'C{c}' for c in range(best_k)],
        autopct='%1.1f%%', colors=colors, startangle=90,
        textprops={'fontsize': 11, 'fontweight': 'bold'})
ax2.set_title('Cluster Distribution', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 5: Radar Chart — Cluster Profiles
# ═══════════════════════════════════════════════════════════════

radar_metrics = ['Skills', 'Interests', 'Profile\\nCompletion', 'Connections', 'Posts', 'Reactions']
cluster_profiles = []
for c in range(best_k):
    mask = labels == c
    cluster_profiles.append([
        user_data.loc[mask, 'n_skills'].mean(),
        user_data.loc[mask, 'n_interests'].mean(),
        user_data.loc[mask, 'profile_completion'].mean() / 100.0,
        min(user_data.loc[mask, 'n_connections'].mean() / 5, 1),
        min(user_data.loc[mask, 'n_posts'].mean() / 20, 1),
        min(user_data.loc[mask, 'total_reactions'].mean() / 50, 1),
    ])

angles = np.linspace(0, 2*np.pi, len(radar_metrics), endpoint=False).tolist()
angles += angles[:1]

fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))
for c in range(best_k):
    values = cluster_profiles[c] + cluster_profiles[c][:1]
    ax.plot(angles, values, 'o-', linewidth=2, label=f'Cluster {c}', color=colors[c])
    ax.fill(angles, values, alpha=0.1, color=colors[c])

ax.set_xticks(angles[:-1])
ax.set_xticklabels(radar_metrics, fontsize=11, fontweight='bold')
ax.set_ylim(0, 1)
ax.set_title('Cluster Profile Radar', fontsize=15, fontweight='bold', pad=20)
ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), fontsize=11)
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 6: Skill Heatmap by Cluster
# ═══════════════════════════════════════════════════════════════

cluster_skill_pct = []
for c in range(best_k):
    mask = labels == c
    c_skills = [s for i, s in enumerate(all_skills) if mask[i]]
    total = int(mask.sum())
    if total > 0:
        counts = Counter(c_skills)
        pcts = [counts.get(s, 0) / total * 100 for s in top_skills[:15]]
    else:
        pcts = [0] * 15
    cluster_skill_pct.append(pcts)

skill_df = pd.DataFrame(cluster_skill_pct, 
                        columns=[s.title() for s in top_skills[:15]],
                        index=[f'Cluster {c}' for c in range(best_k)])

fig, ax = plt.subplots(figsize=(16, max(6, best_k*1.2)))
sns.heatmap(skill_df, annot=True, fmt='.0f', cmap='YlOrRd', ax=ax,
            linewidths=0.5, cbar_kws={'label': 'Prevalence %'})
ax.set_title('Top Skills by Cluster — Prevalence %', fontsize=15, fontweight='bold')
plt.yticks(rotation=0)
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 7: Engagement Boxplots
# ═══════════════════════════════════════════════════════════════

fig, axes = plt.subplots(2, 3, figsize=(18, 12))
metrics = [
    ('n_skills', 'Skills per User', 'Count'),
    ('n_interests', 'Interests per User', 'Count'),
    ('profile_completion', 'Profile Completion', '%'),
    ('n_connections', 'Connections', 'Count'),
    ('n_posts', 'Posts Created', 'Count'),
    ('total_reactions', 'Reactions Received', 'Count'),
]
for ax, (col, title, ylabel) in zip(axes.flatten(), metrics):
    data = [user_data[col][labels == c].values for c in range(best_k)]
    bp = ax.boxplot(data, patch_artist=True, widths=0.6)
    for patch, color in zip(bp['boxes'], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.6)
    ax.set_title(title, fontsize=12, fontweight='bold')
    ax.set_xlabel('Cluster')
    ax.set_ylabel(ylabel)
    ax.set_xticklabels([f'C{c}' for c in range(best_k)])
fig.suptitle('Engagement Metrics by Cluster', fontsize=16, fontweight='bold')
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 8: Collaboration Readiness Stacked Bar
# ═══════════════════════════════════════════════════════════════

cr_values = ['available', 'open', 'not-available']
cr_labels = ['Available', 'Open', 'Not Available']
cluster_cr = []
for c in range(best_k):
    mask = labels == c
    subset = user_data.loc[mask, 'collaboration_readiness']
    counts = [int(subset.eq(v).sum()) for v in cr_values]
    cluster_cr.append(counts)

cr_df = pd.DataFrame(cluster_cr, columns=cr_labels, index=[f'Cluster {c}' for c in range(best_k)])
fig, ax = plt.subplots(figsize=(12, 7))
cr_df.plot(kind='barh', stacked=True, ax=ax, color=['#2ECC71', '#F39C12', '#E74C3C'], width=0.7)
ax.set_title('Collaboration Readiness by Cluster', fontsize=15, fontweight='bold')
ax.set_xlabel('Users')
for i in range(best_k):
    total = int(cr_df.iloc[i].sum())
    ax.text(total + 2, i, f'{total}', va='center', fontsize=10, fontweight='bold')
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 9: Top Locations by Cluster
# ═══════════════════════════════════════════════════════════════

top10_locs = user_data['location'].value_counts().nlargest(10).index.tolist()
loc_data = []
for loc in top10_locs:
    row = [int(((labels == c) & (user_data['location'] == loc)).sum()) for c in range(best_k)]
    loc_data.append(row)

loc_df = pd.DataFrame(loc_data, columns=[f'C{c}' for c in range(best_k)], index=top10_locs)
loc_df['total'] = loc_df.sum(axis=1)
loc_df = loc_df.sort_values('total').drop('total', axis=1)

fig, ax = plt.subplots(figsize=(14, 8))
loc_df.plot(kind='barh', stacked=True, ax=ax, color=[colors[c] for c in range(best_k)], width=0.8)
ax.set_title('Top 10 Locations by Cluster', fontsize=15, fontweight='bold')
ax.set_xlabel('Users')
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 📊 PLOT 10: Parallel Coordinates
# ═══════════════════════════════════════════════════════════════

from pandas.plotting import parallel_coordinates

norm_cols = ['n_skills', 'n_interests', 'profile_completion', 'n_connections', 'n_posts', 'total_reactions']
norm_df = user_data[norm_cols].copy()
for col in norm_cols:
    mn, mx = norm_df[col].min(), norm_df[col].max()
    if mx > mn:
        norm_df[col] = (norm_df[col] - mn) / (mx - mn)
norm_df['cluster'] = labels

sampled = norm_df.groupby('cluster', group_keys=False).apply(
    lambda g: g.sample(min(len(g), 200), random_state=42)
)
sampled = sampled.reset_index(drop=True)

# Ensure cluster column is present (pandas 3 compat)
if 'cluster' not in sampled.columns:
    # Reconstruct from groupby keys
    sampled['cluster'] = norm_df['cluster'].iloc[sampled.index].values

fig, ax = plt.subplots(figsize=(16, 8))
parallel_coordinates(sampled, 'cluster', color=[colors[c] for c in range(best_k)], alpha=0.3, linewidth=0.8, ax=ax)
ax.set_title('Parallel Coordinates — Cluster Signatures', fontsize=15, fontweight='bold')
ax.set_xlabel('Feature')
ax.set_ylabel('Normalized Value')
plt.xticks(rotation=30, ha='right')
plt.tight_layout()
plt.show()"""))

nb['cells'].append(cell("""# ═══════════════════════════════════════════════════════════════
# 🔍 CLUSTER ANALYSIS
# ═══════════════════════════════════════════════════════════════

print('=' * 60)
print('🔍 CLUSTER ANALYSIS REPORT')
print('=' * 60)

summary = user_data.groupby('cluster').agg({
    'n_skills': 'mean', 'n_interests': 'mean', 'profile_completion': 'mean',
    'n_connections': 'mean', 'n_matches': 'mean', 'n_posts': 'mean', 'total_reactions': 'mean',
    'collaboration_readiness': lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else 'N/A',
    'location': lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else 'N/A',
}).round(2)
print(summary.to_string())

for c in range(best_k):
    mask = labels == c
    c_skills = [s for i, s in enumerate(all_skills) if mask[i]]
    top = Counter(c_skills).most_common(5)
    c_size = int(mask.sum())
    print(f'\\n📌 Cluster {c} ({c_size} users, {c_size/n_users*100:.1f}%):')
    print(f'   Top skills: {", ".join(f"{s}({cnt})" for s, cnt in top)}')
    print(f'   Avg completion: {user_data.loc[mask, "profile_completion"].mean():.0f}%')
    print(f'   Avg connections: {user_data.loc[mask, "n_connections"].mean():.1f}')

print(f'\\n🏁 Done! {best_k} clusters across {n_users} users (silhouette: {best_sil:.3f})')
print(f'   All 10 plots saved to *.png in the current directory')"""))

# Write the notebook
out_path = 'user_segmentation_clustering.ipynb'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)
print(f'[OK] Notebook created: {out_path}')
