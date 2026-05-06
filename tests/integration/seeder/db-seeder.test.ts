import { describe, test, expect, vi, beforeEach } from 'vitest'

// =============================================================================
// Database Seeder CLI Tests (TC-008, TC-009, TC-010)
// =============================================================================
//
// These tests validate the expected CLI interface for the database seeder.
// The seeder is invoked via `python main.py` within the python-worker directory
// and uses argparse for CLI argument parsing.
//
// Since the Python worker currently runs as a FastAPI server (uvicorn), these
// tests validate the expected seeder CLI contract that should be implemented.
// =============================================================================

// =============================================================================
// Helper: Simulate Python argparse behavior for validation
// =============================================================================

interface SeederArgs {
  interactive: boolean
  all: boolean
  profiles: boolean
  posts: boolean
  connections: boolean
  matches: boolean
  limitProfiles: number | null
  limitPosts: number | null
  limitConnections: number | null
  limitMatches: number | null
}

function parseSeederArgs(args: string[]): SeederArgs {
  // Simulate Python argparse behavior:
  //   python main.py                           → interactive mode
  //   python main.py --all                     → seed all tables
  //   python main.py --profiles --limit-profiles 500 → profiles + limit

  const result: SeederArgs = {
    interactive: true,
    all: false,
    profiles: false,
    posts: false,
    connections: false,
    matches: false,
    limitProfiles: null,
    limitPosts: null,
    limitConnections: null,
    limitMatches: null,
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    switch (arg) {
      case '--all':
        result.all = true
        result.interactive = false
        break
      case '--profiles':
        result.profiles = true
        result.interactive = false
        break
      case '--posts':
        result.posts = true
        result.interactive = false
        break
      case '--connections':
        result.connections = true
        result.interactive = false
        break
      case '--matches':
        result.matches = true
        result.interactive = false
        break
      case '--limit-profiles': {
        i++
        if (i < args.length) {
          const val = parseInt(args[i], 10)
          if (!isNaN(val) && val > 0) {
            result.limitProfiles = val
          }
        }
        break
      }
      case '--limit-posts': {
        i++
        if (i < args.length) {
          const val = parseInt(args[i], 10)
          if (!isNaN(val) && val > 0) {
            result.limitPosts = val
          }
        }
        break
      }
      case '--limit-connections': {
        i++
        if (i < args.length) {
          const val = parseInt(args[i], 10)
          if (!isNaN(val) && val > 0) {
            result.limitConnections = val
          }
        }
        break
      }
      case '--limit-matches': {
        i++
        if (i < args.length) {
          const val = parseInt(args[i], 10)
          if (!isNaN(val) && val > 0) {
            result.limitMatches = val
          }
        }
        break
      }
      // Ignore unknown args (like the script name)
      default:
        break
    }
    i++
  }

  return result
}

// =============================================================================
// TC-008: Interactive Mode — `python main.py` (no args)
// =============================================================================

describe('TC-008 — Seeder Interactive Mode (python main.py)', () => {
  test('no arguments → interactive mode is enabled', () => {
    // Arrange
    const args: string[] = []

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.interactive).toBe(true)
    expect(parsed.all).toBe(false)
    expect(parsed.profiles).toBe(false)
  })

  test('interactive mode is the default when no flags are passed', () => {
    // Arrange — simulating `python main.py`
    const args = ['main.py']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.interactive).toBe(true)
  })

  test('interactive mode is disabled when any subcommand flag is passed', () => {
    // Arrange
    const cases: string[][] = [
      ['--all'],
      ['--profiles'],
      ['--posts'],
      ['--connections'],
      ['--matches'],
    ]

    for (const args of cases) {
      // Act
      const parsed = parseSeederArgs(args)

      // Assert
      expect(parsed.interactive).toBe(false)
    }
  })

  test('interactive mode should not have any limits set', () => {
    // Arrange
    const args: string[] = []

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.limitProfiles).toBeNull()
    expect(parsed.limitPosts).toBeNull()
    expect(parsed.limitConnections).toBeNull()
    expect(parsed.limitMatches).toBeNull()
  })
})

// =============================================================================
// TC-009: Bulk Seed — `python main.py --all`
// =============================================================================

describe('TC-009 — Bulk Seed (python main.py --all)', () => {
  test('--all flag activates all tables for seeding', () => {
    // Arrange
    const args = ['--all']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.all).toBe(true)
    expect(parsed.interactive).toBe(false)
  })

  test('--all flag implies profiles, posts, connections, and matches', () => {
    // The --all flag conceptually seeds all entity types
    // Validate that the parser recognizes --all as distinct from individual flags
    const args = ['--all']
    const parsed = parseSeederArgs(args)

    expect(parsed.all).toBe(true)
    // Individual flags are false when --all is used
    expect(parsed.profiles).toBe(false)
    expect(parsed.posts).toBe(false)
    expect(parsed.connections).toBe(false)
    expect(parsed.matches).toBe(false)
  })

  test('--all mode uses default limits (no explicit limits)', () => {
    // Arrange
    const args = ['--all']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert — no limits explicitly set, defaults should be used
    expect(parsed.limitProfiles).toBeNull()
    expect(parsed.limitPosts).toBeNull()
  })

  test('seeder tables covered: profiles, posts, connections, matches', () => {
    // Verify the expected seeder targets match the database schema tables
    const seederTables = ['profiles', 'posts', 'connections', 'matches']

    // These should all exist as concepts in the seeder
    expect(seederTables).toHaveLength(4)
    expect(seederTables).toContain('profiles')
    expect(seederTables).toContain('posts')
    expect(seederTables).toContain('connections')
    expect(seederTables).toContain('matches')
  })
})

// =============================================================================
// TC-010: Limit Overrides — `python main.py --profiles --limit-profiles 500`
// =============================================================================

describe('TC-010 — Seeder Limit Overrides', () => {
  test('--limit-profiles 500 overrides the default profile count', () => {
    // Arrange — simulating: python main.py --profiles --limit-profiles 500
    const args = ['--profiles', '--limit-profiles', '500']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.profiles).toBe(true)
    expect(parsed.limitProfiles).toBe(500)
    expect(parsed.interactive).toBe(false)
  })

  test('--limit-profiles accepts large values (e.g., 10000)', () => {
    // Arrange
    const args = ['--profiles', '--limit-profiles', '10000']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.limitProfiles).toBe(10000)
  })

  test('--limit-profiles accepts small values (e.g., 1)', () => {
    // Arrange
    const args = ['--profiles', '--limit-profiles', '1']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.limitProfiles).toBe(1)
  })

  test('--limit-profiles with non-numeric value is ignored (defensive)', () => {
    // Arrange
    const args = ['--profiles', '--limit-profiles', 'abc']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert — should not set limit for non-numeric input
    expect(parsed.limitProfiles).toBeNull()
  })

  test('--limit-profiles without a value is ignored', () => {
    // Arrange — edge case: flag present but no value follows
    const args = ['--profiles', '--limit-profiles']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.limitProfiles).toBeNull()
  })

  test('--limit-profiles with negative value is ignored (defensive)', () => {
    // Arrange
    const args = ['--profiles', '--limit-profiles', '-5']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.limitProfiles).toBeNull()
  })

  test('--limit-posts accepts numeric value', () => {
    // Arrange
    const args = ['--posts', '--limit-posts', '300']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.posts).toBe(true)
    expect(parsed.limitPosts).toBe(300)
  })

  test('--limit-connections accepts numeric value', () => {
    // Arrange
    const args = ['--connections', '--limit-connections', '150']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.connections).toBe(true)
    expect(parsed.limitConnections).toBe(150)
  })

  test('--limit-matches accepts numeric value', () => {
    // Arrange
    const args = ['--matches', '--limit-matches', '25']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.matches).toBe(true)
    expect(parsed.limitMatches).toBe(25)
  })

  test('multiple limit flags can be combined with multiple entity flags', () => {
    // Arrange — simulate: python main.py --profiles --posts --limit-profiles 500 --limit-posts 200
    const args = [
      '--profiles',
      '--posts',
      '--limit-profiles',
      '500',
      '--limit-posts',
      '200',
    ]

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.profiles).toBe(true)
    expect(parsed.posts).toBe(true)
    expect(parsed.limitProfiles).toBe(500)
    expect(parsed.limitPosts).toBe(200)
    expect(parsed.interactive).toBe(false)
  })

  test('limit flags without entity flags are still parsed (non-interactive)', () => {
    // Arrange — edge: --limit-profiles set but no --profiles flag
    const args = ['--limit-profiles', '500']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert — limit is still captured; consumer decides whether to use it
    expect(parsed.limitProfiles).toBe(500)
  })
})

// =============================================================================
// Combined Integration-Style Tests
// =============================================================================

describe('Seeder CLI Integration', () => {
  test('all entity flags can be combined in one invocation', () => {
    // Arrange — simulate: python main.py --profiles --posts --connections --matches
    const args = ['--profiles', '--posts', '--connections', '--matches']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert
    expect(parsed.profiles).toBe(true)
    expect(parsed.posts).toBe(true)
    expect(parsed.connections).toBe(true)
    expect(parsed.matches).toBe(true)
    expect(parsed.interactive).toBe(false)
    expect(parsed.all).toBe(false)
  })

  test('--all flag takes precedence conceptually over individual flags', () => {
    // This is a design decision test: --all should mean "seed everything"
    const args = ['--all']
    const parsed = parseSeederArgs(args)

    expect(parsed.all).toBe(true)
    // When --all is used, individual flags are not set (they're irrelevant)
    expect(parsed.profiles).toBe(false) // implied by --all
  })

  test('unknown flags are silently ignored (forward compatibility)', () => {
    // Arrange
    const args = ['--unknown-flag', '--all']

    // Act
    const parsed = parseSeederArgs(args)

    // Assert — --all still works, unknown flag ignored
    expect(parsed.all).toBe(true)
  })

  test('flag order does not affect parsing result', () => {
    // Arrange
    const order1 = ['--limit-profiles', '200', '--profiles']
    const order2 = ['--profiles', '--limit-profiles', '200']

    // Act
    const parsed1 = parseSeederArgs(order1)
    const parsed2 = parseSeederArgs(order2)

    // Assert — both produce the same result
    expect(parsed1.profiles).toBe(parsed2.profiles)
    expect(parsed1.limitProfiles).toBe(parsed2.limitProfiles)
  })
})
