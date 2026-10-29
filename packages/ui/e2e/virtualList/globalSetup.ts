import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const port = Number(process.env['FOLDKIT_VIRTUAL_LIST_E2E_PORT'] ?? 4197)
const address = `http://127.0.0.1:${port}`
const repositoryDirectory = fileURLToPath(
  new URL('../../../../', import.meta.url),
)
const configPath = fileURLToPath(new URL('./vite.config.ts', import.meta.url))
const vitePath = fileURLToPath(
  new URL('../../../../node_modules/vite/bin/vite.js', import.meta.url),
)

const assertAvailablePort = () =>
  new Promise<void>((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => server.close(() => resolve()))
  })

const globalSetup = async () => {
  await assertAvailablePort()

  const server = spawn(
    process.execPath,
    [
      vitePath,
      '--config',
      configPath,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: repositoryDirectory,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    },
  )
  const output: Array<string> = []
  server.stdout.on('data', chunk => output.push(String(chunk)))
  server.stderr.on('data', chunk => output.push(String(chunk)))

  const killProcessGroup = (signal: NodeJS.Signals) => {
    if (server.pid !== undefined) {
      try {
        process.kill(-server.pid, signal)
      } catch (error) {
        if (
          !(error instanceof Error && 'code' in error && error.code === 'ESRCH')
        ) {
          throw error
        }
      }
    }
  }
  const onExit = () => killProcessGroup('SIGKILL')
  const onInterrupt = () => {
    killProcessGroup('SIGKILL')
    process.exit(130)
  }
  process.once('exit', onExit)
  process.once('SIGINT', onInterrupt)
  process.once('SIGTERM', onInterrupt)

  const cleanup = async () => {
    killProcessGroup('SIGTERM')

    for (const attempt of Array.from({ length: 40 }, (_, index) => index)) {
      if (server.exitCode !== null || server.signalCode !== null) {
        break
      }

      await setTimeout(50)

      if (attempt === 39) {
        killProcessGroup('SIGKILL')
      }
    }

    process.removeListener('exit', onExit)
    process.removeListener('SIGINT', onInterrupt)
    process.removeListener('SIGTERM', onInterrupt)
  }

  try {
    for (const attempt of Array.from({ length: 200 }, (_, index) => index)) {
      if (server.exitCode !== null || server.signalCode !== null) {
        throw new Error(
          `VirtualList fixture server exited:\n${output.join('')}`,
        )
      }

      const response = await fetch(address).catch(() => undefined)

      if (response?.ok) {
        return cleanup
      }

      if (attempt === 199) {
        throw new Error(
          `VirtualList fixture server did not start:\n${output.join('')}`,
        )
      }

      await setTimeout(100)
    }
  } catch (error) {
    await cleanup()
    throw error
  }

  throw new Error('VirtualList fixture readiness loop ended unexpectedly')
}

export default globalSetup
