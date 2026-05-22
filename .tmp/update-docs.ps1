# Update matching-system.md
$f = [System.IO.File]::ReadAllText("docs\03-core-features\matching-system.md", [System.Text.Encoding]::UTF8)

# old getMatches code
$oldCode = @'
export async function getMatchSuggestions(userId: string, limit = 10) {
  const supabase = createClient()
  
  // 1. Get user's embedding
  const { data: userEmbedding } = await supabase
    .from('profile_embeddings')
    .select('embedding')
    .eq('user_id', userId)
    .single()
  
  // 2. Find similar profiles
  const { data: matches } = await supabase.rpc('get_matches', {
    query_embedding: userEmbedding.embedding,
    match_limit: limit
  })
  
  return matches
}
'@

$newCode = @'
export async function getMatchSuggestions(userId: string, limit = 10) {
  return generateMatchesForUser(userId, { limit, minScore: 50 });
}
'@

$f = $f.Replace($oldCode, $newCode)
[System.IO.File]::WriteAllText("docs\03-core-features\matching-system.md", $f, [System.Text.Encoding]::UTF8)
Write-Host "1/9 Updated matching-system.md"

# Update python-worker overview — fix 768 -> 384
$f = [System.IO.File]::ReadAllText("docs\04-infrastructure\python-worker\overview.md", [System.Text.Encoding]::UTF8)
$f = $f.Replace("(768 dimensions)", "(384 dimensions)")
[System.IO.File]::WriteAllText("docs\04-infrastructure\python-worker\overview.md", $f, [System.Text.Encoding]::UTF8)
Write-Host "2/9 Updated python-worker overview dimension"

# Update vector-embeddings overview — fix 768 -> 384
$f = [System.IO.File]::ReadAllText("docs\03-core-features\vector-embeddings\overview.md", [System.Text.Encoding]::UTF8)
$f = $f.Replace("768 dimensions", "384 dimensions")
$f = $f.Replace('"dimensions": 768', '"dimensions": 384')
$f = $f.Replace("(768 dim)", "(384 dim)")
[System.IO.File]::WriteAllText("docs\03-core-features\vector-embeddings\overview.md", $f, [System.Text.Encoding]::UTF8)
Write-Host "3/9 Updated vector-embeddings overview dimensions"

# Update commands.md
$f = [System.IO.File]::ReadAllText("docs\07-reference\commands.md", [System.Text.Encoding]::UTF8)
$f = $f.Replace("feed-scorer.test.ts", "feed-scorer.ts (native TS scoring)")
$f = $f.Replace("notification-engine*", "notification-engine (native TS)")
[System.IO.File]::WriteAllText("docs\07-reference\commands.md", $f, [System.Text.Encoding]::UTF8)
Write-Host "4/9 Updated commands.md references"

# Update implementation plan
$f = [System.IO.File]::ReadAllText("docs\IMPLEMENTATION_PLAN.md", [System.Text.Encoding]::UTF8)
$f = $f.Replace("lib/services/match-generation.ts", "lib/services/match-generator.ts (native, migrated)")
$f = $f.Replace("Gemini (in Python worker)", "Gemini (in native TS provider registry)")
$f = $f.Replace("LLM_PROVIDER=openai", "AI_PROVIDER_1=openai")
[System.IO.File]::WriteAllText("docs\IMPLEMENTATION_PLAN.md", $f, [System.Text.Encoding]::UTF8)
Write-Host "5/9 Updated IMPLEMENTATION_PLAN.md"

# Update FRONTEND-INTEGRATION-GUIDE
$f = [System.IO.File]::ReadAllText("docs\FRONTEND-INTEGRATION-GUIDE.md", [System.Text.Encoding]::UTF8)
$f = $f.Replace("Python Worker Endpoints", "Native TS Endpoints")
$f = $f.Replace("Python worker unavailable", "service unavailable")
$f = $f.Replace("GEMINI_API_KEY=your-key", "# AI providers are configured via AI_PROVIDER_N_* env vars")
[System.IO.File]::WriteAllText("docs\FRONTEND-INTEGRATION-GUIDE.md", $f, [System.Text.Encoding]::UTF8)
Write-Host "6/9 Updated FRONTEND-INTEGRATION-GUIDE.md"

# Update ai-assistant overview
$f = [System.IO.File]::ReadAllText("docs\03-core-features\ai-assistant\overview.md", [System.Text.Encoding]::UTF8)
$f = $f.Replace("4. Supabase Edge Functions: Serverless TypeScript", "4. Native TypeScript Services: In-process matching, embeddings, and AI")
$f = $f.Replace("Generating Embeddings (requires OpenAI Key).", "Embedding generation via Python worker (Sentence Transformers).")
$f = $f.Replace("Semantic Matching logic (Cosine Similarity).", "Semantic Matching via native cosine similarity (match-generator.ts).")
$f = $f.Replace("AI Assistant processing.", "AI processing via universal provider registry (OpenAI, Anthropic, etc.).")
[System.IO.File]::WriteAllText("docs\03-core-features\ai-assistant\overview.md", $f, [System.Text.Encoding]::UTF8)
Write-Host "7/9 Updated ai-assistant overview.md"

# Update deployment checklist
$f = [System.IO.File]::ReadAllText("docs\05-deployment\checklist.md", [System.Text.Encoding]::UTF8)
$f = $f.Replace("OPENAI_API_KEY=xxx (or ANTHROPIC_API_KEY)", "# AI provider keys (set via AI_PROVIDER_N_* vars)")
$f = $f.Replace("LLM_PROVIDER=openai (or anthropic)", "# See environment-variables.md for AI provider config")
[System.IO.File]::WriteAllText("docs\05-deployment\checklist.md", $f, [System.Text.Encoding]::UTF8)
Write-Host "8/9 Updated deployment checklist.md"

# Update runbook
$f = [System.IO.File]::ReadAllText("docs\05-deployment\runbook.md", [System.Text.Encoding]::UTF8)
$f = $f.Replace("| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | LLM provider key | `sk-...` |", "| `AI_PROVIDER_1_KEY` | AI provider key | `sk-...` |")
$f = $f.Replace("| `LLM_PROVIDER` | Provider name | `openai` or `anthropic` |", "| `AI_PROVIDER_1` | Provider name | `openai` |")
[System.IO.File]::WriteAllText("docs\05-deployment\runbook.md", $f, [System.Text.Encoding]::UTF8)
Write-Host "9/9 Updated runbook.md"

Write-Host ""
Write-Host "All doc updates complete!"
