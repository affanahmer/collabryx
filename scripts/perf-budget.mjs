/**
 * Performance Budget Monitor
 * Checks Next.js build output sizes against defined budgets
 * Exit code 1 if any budget is exceeded
 */

import { readdir, stat } from 'fs/promises'
import { join } from 'path'

// Performance budgets (in KB)
const BUDGETS = {
  // Total .next folder size
  totalBuild: 50_000, // 50MB
  // Single JS chunk max
  jsChunk: 500, // 500KB
  // Total JS chunks
  totalJs: 10_000, // 10MB
  // Single CSS chunk max
  cssChunk: 100, // 100KB
  // Total CSS chunks
  totalCss: 500, // 500KB
  // Single image max (in public/)
  imageMax: 1000, // 1MB
}

const nextDir = join(process.cwd(), '.next')
const staticDir = join(nextDir, 'static')

async function getDirSize(dir) {
  let total = 0
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        total += await getDirSize(fullPath)
      } else {
        const s = await stat(fullPath)
        total += s.size
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return total
}

async function getFileSizes(dir, extension) {
  const files = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...await getFileSizes(fullPath, extension))
      } else if (entry.name.endsWith(extension)) {
        const s = await stat(fullPath)
        files.push({ name: entry.name, size: s.size })
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return files
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function main() {
  console.log('📊 Performance Budget Check\n')

  let hasViolations = false

  // Check total build size
  const totalSize = await getDirSize(nextDir)
  const totalBudget = BUDGETS.totalBuild * 1024
  const totalPercent = ((totalSize / totalBudget) * 100).toFixed(1)
  const totalOk = totalSize <= totalBudget
  console.log(`Total build: ${formatSize(totalSize)} / ${formatSize(totalBudget)} (${totalPercent}%) ${totalOk ? '✅' : '❌'}`)
  if (!totalOk) hasViolations = true

  // Check JS chunks
  const jsFiles = await getFileSizes(staticDir, '.js')
  const totalJsSize = jsFiles.reduce((sum, f) => sum + f.size, 0)
  const totalJsBudget = BUDGETS.totalJs * 1024
  const totalJsPercent = ((totalJsSize / totalJsBudget) * 100).toFixed(1)
  const totalJsOk = totalJsSize <= totalJsBudget
  console.log(`Total JS: ${formatSize(totalJsSize)} / ${formatSize(totalJsBudget)} (${totalJsPercent}%) ${totalJsOk ? '✅' : '❌'}`)
  if (!totalJsOk) hasViolations = true

  // Check largest JS chunk
  const largestJs = jsFiles.reduce((max, f) => f.size > max.size ? f : max, { name: '', size: 0 })
  const jsChunkBudget = BUDGETS.jsChunk * 1024
  const largestJsPercent = ((largestJs.size / jsChunkBudget) * 100).toFixed(1)
  const largestJsOk = largestJs.size <= jsChunkBudget
  console.log(`Largest JS: ${largestJs.name} (${formatSize(largestJs.size)} / ${formatSize(jsChunkBudget)}) ${largestJsPercent}% ${largestJsOk ? '✅' : '❌'}`)
  if (!largestJsOk) hasViolations = true

  // Check CSS chunks
  const cssFiles = await getFileSizes(staticDir, '.css')
  const totalCssSize = cssFiles.reduce((sum, f) => sum + f.size, 0)
  const totalCssBudget = BUDGETS.totalCss * 1024
  const totalCssPercent = ((totalCssSize / totalCssBudget) * 100).toFixed(1)
  const totalCssOk = totalCssSize <= totalCssBudget
  console.log(`Total CSS: ${formatSize(totalCssSize)} / ${formatSize(totalCssBudget)} (${totalCssPercent}%) ${totalCssOk ? '✅' : '❌'}`)
  if (!totalCssOk) hasViolations = true

  // Check largest CSS chunk
  const largestCss = cssFiles.reduce((max, f) => f.size > max.size ? f : max, { name: '', size: 0 })
  const cssChunkBudget = BUDGETS.cssChunk * 1024
  const largestCssPercent = largestCss.size > 0 ? ((largestCss.size / cssChunkBudget) * 100).toFixed(1) : '0.0'
  const largestCssOk = largestCss.size <= cssChunkBudget
  console.log(`Largest CSS: ${largestCss.name || 'none'} (${formatSize(largestCss.size)} / ${formatSize(cssChunkBudget)}) ${largestCssPercent}% ${largestCssOk ? '✅' : '❌'}`)
  if (!largestCssOk) hasViolations = true

  console.log('')

  if (hasViolations) {
    console.log('❌ Performance budget exceeded!')
    console.log('Tips:')
    console.log('  - Use dynamic imports for heavy components')
    console.log('  - Tree-shake unused library code')
    console.log('  - Optimize images with next/image')
    console.log('  - Remove unused dependencies')
    process.exit(1)
  } else {
    console.log('✅ All performance budgets passed!')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
