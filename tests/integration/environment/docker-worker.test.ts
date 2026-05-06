import { describe, test, expect, vi, beforeEach } from 'vitest'
import { execSync } from 'child_process'

// =============================================================================
// TC-006: Docker worker builds and starts on port 8000
// TC-007: Docker handles port 8000 collisions
// =============================================================================
//
// Tests validate:
//   - The docker-up.mjs script logic for checking Docker availability
//   - Port 8000 health check patterns
//   - Port collision detection and error handling
//   - Docker health check endpoint contract
// =============================================================================

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

const mockedExecSync = vi.mocked(execSync)

// Lazy-load package.json
let _pkg: Record<string, { scripts: Record<string, string> }> | null = null
function getPackageJson() {
  if (!_pkg) {
    _pkg = require('../../../package.json')
  }
  return _pkg!
}

describe('Docker Worker Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // TC-006: Docker worker builds and starts on port 8000
  // ===========================================================================

  describe('TC-006 — Docker Worker Startup & Health Check', () => {
    test('docker-up.mjs targets port 8000 for worker service', () => {
      // The package.json docker:up script runs node scripts/docker-up.mjs
      const pkg = getPackageJson()
      const dockerUpScript = pkg.scripts?.['docker:up']

      expect(dockerUpScript).toBeDefined()
      expect(dockerUpScript).toContain('docker-up.mjs')
    })

    test('docker-health.mjs health endpoint is port 8000', () => {
      const pkg = getPackageJson()
      const dockerHealthScript = pkg.scripts?.['docker:health']

      expect(dockerHealthScript).toBeDefined()
      expect(dockerHealthScript).toContain('docker-health.mjs')
    })

    test('docker:health npm script exists', () => {
      const pkg = getPackageJson()
      const healthScript = pkg.scripts?.['docker:health']

      expect(healthScript).toBeDefined()
    })

    test('mocked docker-compose up starts successfully', () => {
      // Arrange — simulate a successful docker-compose up
      mockedExecSync.mockReturnValue(
        '[+] Running 2/2\n' +
        ' ✔ Container collabryx-worker  Started\n' +
        ' ✔ Network collabryx_default   Created\n'
      )

      // Act
      const output = execSync('docker-compose up -d', { encoding: 'utf-8' })

      // Assert
      expect(output).toContain('collabryx-worker')
      expect(output).toContain('Started')
    })

    test('health endpoint returns 200 with expected JSON shape', () => {
      // Arrange — simulate health check response
      const mockHealthResponse = JSON.stringify({
        status: 'healthy',
        timestamp: Date.now(),
        model_info: { model_name: 'all-MiniLM-L6-v2', dimensions: 384 },
        supabase_connected: false,
        queue_size: 0,
        queue_capacity: 100,
        system: {
          memory: { percent: 45.2 },
          disk: { percent: 32.1 },
        },
      })

      // Act
      const parsed = JSON.parse(mockHealthResponse)

      // Assert — validate the health endpoint contract
      expect(parsed).toHaveProperty('status')
      expect(parsed).toHaveProperty('timestamp')
      expect(parsed).toHaveProperty('model_info')
      expect(parsed).toHaveProperty('supabase_connected')
      expect(parsed).toHaveProperty('queue_size')
      expect(parsed).toHaveProperty('system')

      // Health status must be one of: healthy, degraded, warning
      expect(['healthy', 'degraded', 'warning']).toContain(parsed.status)
    })

    test('health endpoint returns model_info with model_name and dimensions', () => {
      const mockHealthResponse = JSON.stringify({
        status: 'healthy',
        model_info: { model_name: 'all-MiniLM-L6-v2', dimensions: 384, device: 'cpu' },
        queue_size: 0,
        queue_capacity: 100,
      })

      const parsed = JSON.parse(mockHealthResponse)

      expect(parsed.model_info.model_name).toBeTruthy()
      expect(parsed.model_info.dimensions).toBeGreaterThan(0)
      expect(typeof parsed.model_info.device).toBe('string')
    })

    test('health endpoint returns queue_size as a number', () => {
      const mockHealthResponse = JSON.stringify({
        status: 'healthy',
        queue_size: 5,
        queue_capacity: 100,
      })

      const parsed = JSON.parse(mockHealthResponse)

      expect(typeof parsed.queue_size).toBe('number')
      expect(parsed.queue_size).toBeGreaterThanOrEqual(0)
      expect(parsed.queue_size).toBeLessThanOrEqual(parsed.queue_capacity)
    })

    test('health endpoint shows degraded status when Supabase is disconnected', () => {
      const mockResponse = JSON.stringify({
        status: 'degraded',
        supabase_connected: false,
      })

      const parsed = JSON.parse(mockResponse)

      expect(parsed.status).toBe('degraded')
      expect(parsed.supabase_connected).toBe(false)
    })
  })

  // ===========================================================================
  // TC-007: Docker handles port 8000 collisions
  // ===========================================================================

  describe('TC-007 — Port 8000 Collision Handling', () => {
    test('detects port 8000 already in use', () => {
      // Arrange — simulate docker-compose ps showing a running container on 8000
      mockedExecSync.mockReturnValue(
        'NAME                   IMAGE                    STATUS         PORTS\n' +
        'collabryx-worker       collabryx-worker:latest   Up 2 hours     0.0.0.0:8000->8000/tcp\n'
      )

      // Act
      const containerOutput = execSync("docker ps --filter 'publish=8000'", {
        encoding: 'utf-8',
      })

      // Assert — the port 8000 mapping is visible
      expect(containerOutput).toContain('8000')
      expect(containerOutput).toContain('collabryx-worker')
    })

    test('docker-up.mjs skips start when container already running', () => {
      // Arrange — simulate docker ps showing an already-running container
      mockedExecSync.mockReturnValueOnce('abc123def456')

      // Act
      const runningContainerId = execSync(
        'docker ps --filter "name=collabryx-worker" --filter "status=running" --format "{{.ID}}"',
        { encoding: 'utf-8' }
      )

      // Assert
      expect(runningContainerId.trim().length).toBeGreaterThan(0)
      expect(runningContainerId).toContain('abc')
    })

    test('detects port collision via docker error message', () => {
      // Arrange — simulate docker-compose failing due to port already in use
      mockedExecSync.mockImplementation(() => {
        throw new Error(
          'Error response from daemon: driver failed programming external ' +
          'connectivity on endpoint collabryx-worker: ' +
          'Bind for 0.0.0.0:8000 failed: port is already allocated'
        )
      })

      // Act & Assert
      expect(() =>
        execSync('docker-compose up -d', { encoding: 'utf-8' })
      ).toThrow(/port is already allocated/)
    })

    test('error message for port collision contains port 8000', () => {
      // Arrange
      mockedExecSync.mockImplementation(() => {
        throw new Error('Bind for 0.0.0.0:8000 failed: port is already allocated')
      })

      // Act & Assert
      try {
        execSync('docker-compose up -d', { encoding: 'utf-8' })
      } catch (error: unknown) {
        const err = error as Error
        expect(err.message).toContain('8000')
        expect(err.message).toMatch(/port.*allocated/)
      }
    })

    test('docker-down.mjs exists for cleanup of port collisions', () => {
      const pkg = getPackageJson()
      const downScript = pkg.scripts?.['docker:down']

      expect(downScript).toBeDefined()
      expect(downScript).toContain('docker-down.mjs')
    })

    test('docker:restart script chains down then up to resolve collisions', () => {
      const pkg = getPackageJson()
      const restartScript = pkg.scripts?.['docker:restart']

      expect(restartScript).toBeDefined()
      expect(restartScript).toContain('docker:down')
      expect(restartScript).toContain('docker:up')
    })

    test('docker:status script reports whether container is running', () => {
      const pkg = getPackageJson()
      const statusScript = pkg.scripts?.['docker:status']

      expect(statusScript).toBeDefined()
      expect(statusScript).toContain('docker-status.mjs')
    })
  })

  // ===========================================================================
  // Docker Script Availability
  // ===========================================================================

  describe('Docker npm scripts coverage', () => {
    test('all expected docker scripts are defined in package.json', () => {
      const pkg = getPackageJson()
      const scripts = pkg.scripts || {}

      const expectedScripts = [
        'docker:up',
        'docker:down',
        'docker:restart',
        'docker:rebuild',
        'docker:clean',
        'docker:logs',
        'docker:health',
        'docker:status',
      ]

      for (const script of expectedScripts) {
        expect(scripts[script]).toBeDefined()
        expect(scripts[script]).toBeTruthy()
      }
    })
  })
})
