import { Config, Effect, Exit, Fiber, Option } from 'effect'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { createServer, request } from 'node:http'
import { createConnection } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { type ServeOptions, serve } from '../src/index.ts'

type BuildFixture = Readonly<{
  abortStartedPath: string
  abortedPath: string
  canceledPath: string
  clientDirectory: string
  manifestPath: string
  rootDirectory: string
}>

type BuildFixtureOptions = Readonly<{
  schemaVersion?: number
  isServerOutsideRoot?: boolean
}>

const fixtureDirectories: Array<string> = []
const handlerFixtureUrl = new URL('./fixture/handler.mjs', import.meta.url)
const importMarkerFixtureUrl = new URL(
  './fixture/import-marker.mjs',
  import.meta.url,
)

const getAvailablePort = (): Promise<number> =>
  new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        reject(new Error('Node did not allocate a TCP port'))
        return
      }
      server.close(error => {
        if (error === undefined) {
          resolvePort(address.port)
        } else {
          reject(error)
        }
      })
    })
  })

const waitForResponse = async (url: string): Promise<Response> => {
  let lastError: unknown = undefined
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(100) })
    } catch (error) {
      lastError = error
      await new Promise(resolveWait => setTimeout(resolveWait, 25))
    }
  }
  throw lastError
}

const waitForFile = async (path: string): Promise<string> => {
  let lastError: unknown = undefined
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      return await readFile(path, 'utf8')
    } catch (error) {
      lastError = error
      await new Promise(resolveWait => setTimeout(resolveWait, 25))
    }
  }
  throw lastError
}

const requestTarget = (
  port: number,
  path: string,
): Promise<Readonly<{ status: number; body: string }>> =>
  new Promise((resolveResponse, reject) => {
    const client = request(
      {
        hostname: 'localhost',
        port,
        path,
      },
      response => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', chunk => {
          body += chunk
        })
        response.on('end', () => {
          resolveResponse({ status: response.statusCode ?? 0, body })
        })
      },
    )
    client.on('error', reject)
    client.end()
  })

const expectTypedStartupFailure = async (
  options: ServeOptions,
  expectedMessage: RegExp,
) => {
  const exit = await Effect.runPromiseExit(serve(options))
  expect(Exit.isFailure(exit)).toBe(true)

  if (Exit.isFailure(exit)) {
    expect(exit.cause.reasons).toEqual([
      expect.objectContaining({
        _tag: 'Fail',
        error: expect.objectContaining({
          message: expect.stringMatching(expectedMessage),
        }),
      }),
    ])
  }
}

const createFixture = async ({
  schemaVersion = 1,
  isServerOutsideRoot = false,
}: BuildFixtureOptions = {}): Promise<BuildFixture> => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'foldkit-node-'))
  fixtureDirectories.push(rootDirectory)

  const viteRootDirectory = join(rootDirectory, 'application')
  const abortStartedPath = join(rootDirectory, 'abort-started')
  const abortedPath = join(rootDirectory, 'aborted')
  const canceledPath = join(rootDirectory, 'canceled')
  const clientDirectory = join(viteRootDirectory, 'generated', 'browser')
  const serverDirectory = isServerOutsideRoot
    ? join(rootDirectory, 'runtime')
    : join(viteRootDirectory, 'generated', 'runtime')
  await mkdir(clientDirectory, { recursive: true })
  await mkdir(serverDirectory, { recursive: true })
  await writeFile(join(clientDirectory, 'asset.txt'), 'static asset')
  await writeFile(join(clientDirectory, 'index.html'), 'static index')
  await copyFile(handlerFixtureUrl, join(serverDirectory, 'handler.mjs'))
  await writeFile(
    join(serverDirectory, 'handler.config.json'),
    `${JSON.stringify({ abortStartedPath, abortedPath, canceledPath })}\n`,
  )
  const manifestPath = join(serverDirectory, 'foldkit.build.json')
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      schemaVersion,
      client: 'generated/browser',
      server: isServerOutsideRoot ? '../runtime' : 'generated/runtime',
      serverEntry: 'handler.mjs',
      prerendered: [],
    })}\n`,
  )

  return {
    abortStartedPath,
    abortedPath,
    canceledPath,
    clientDirectory,
    manifestPath,
    rootDirectory: viteRootDirectory,
  }
}

afterEach(async () => {
  await Promise.all(
    fixtureDirectories
      .splice(0)
      .map(directory => rm(directory, { recursive: true, force: true })),
  )
})

describe('serve', () => {
  it('uses one resolved port for listening and the default origin', async () => {
    const fixture = await createFixture()
    const port = await getAvailablePort()
    let resolutions = 0
    const changingPort = Config.succeed(port).pipe(
      Config.map(value => {
        resolutions += 1
        return value + resolutions - 1
      }),
    )
    const fiber = Effect.runFork(
      serve({
        port: changingPort,
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
      }),
    )

    try {
      const response = await waitForResponse(
        `http://localhost:${String(port)}/index.html`,
      )
      expect(await response.text()).toBe(
        `http://localhost:${String(port)}/index.html`,
      )
      expect(resolutions).toBe(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('serves only files whose real paths remain within the client directory', async () => {
    const fixture = await createFixture()
    const outsideFile = join(fixture.rootDirectory, 'outside-secret.txt')
    await writeFile(outsideFile, 'OUTSIDE-SECRET')
    await symlink(outsideFile, join(fixture.clientDirectory, 'leak.txt'))
    await symlink(
      join(fixture.clientDirectory, 'asset.txt'),
      join(fixture.clientDirectory, 'internal.txt'),
    )
    const port = await getAvailablePort()
    const fiber = Effect.runFork(
      serve({
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
      }),
    )

    try {
      const leaked = await waitForResponse(
        `http://localhost:${String(port)}/leak.txt`,
      )
      expect(await leaked.text()).toBe(
        `http://localhost:${String(port)}/leak.txt`,
      )

      const ranged = await fetch(`http://localhost:${String(port)}/leak.txt`, {
        headers: { range: 'bytes=100-' },
      })
      expect(ranged.headers.has('content-range')).toBe(false)
      expect(await ranged.text()).toBe(
        `http://localhost:${String(port)}/leak.txt`,
      )

      const internal = await waitForResponse(
        `http://localhost:${String(port)}/internal.txt`,
      )
      expect(await internal.text()).toBe('static asset')

      const internalRange = await fetch(
        `http://localhost:${String(port)}/internal.txt`,
        { headers: { range: 'bytes=0-5' } },
      )
      expect(internalRange.status).toBe(206)
      expect(await internalRange.text()).toBe('static')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('preserves same-name cookies with different paths', async () => {
    const fixture = await createFixture()
    const port = await getAvailablePort()
    const fiber = Effect.runFork(
      serve({
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
      }),
    )

    try {
      const response = await waitForResponse(
        `http://localhost:${String(port)}/cookies`,
      )
      expect(response.headers.getSetCookie()).toEqual([
        'sid=app; Path=/app; HttpOnly',
        'sid=gone; Path=/; Max-Age=0; HttpOnly',
      ])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('cancels a streamed Fetch body for HEAD', async () => {
    const fixture = await createFixture()
    const port = await getAvailablePort()
    const fiber = Effect.runFork(
      serve({
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
      }),
    )

    try {
      await waitForResponse(`http://localhost:${String(port)}/asset.txt`)

      const response = await fetch(
        `http://localhost:${String(port)}/head-stream`,
        { method: 'HEAD' },
      )
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('')
      await expect(waitForFile(fixture.abortedPath)).resolves.toBe('canceled')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reads a versioned manifest to serve custom output paths and the fetch handler', async () => {
    const fixture = await createFixture()
    const port = await getAvailablePort()
    const fiber = Effect.runFork(
      serve({
        port: Config.succeed(port),
        origin: Config.succeed(Option.some('HTTPS://PUBLIC.EXAMPLE:443/')),
        manifestPath: fixture.manifestPath,
      }),
    )

    try {
      const asset = await waitForResponse(
        `http://localhost:${String(port)}/asset.txt`,
      )
      expect(await asset.text()).toBe('static asset')

      const page = await waitForResponse(
        `http://localhost:${String(port)}/index.html`,
      )
      expect(await page.text()).toBe('https://public.example/index.html')

      const refused = await requestTarget(port, '//elsewhere.example/asset.txt')
      expect(refused).toEqual({ status: 400, body: '' })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  for (const origin of [
    'not an origin',
    'https://[invalid/',
    'ftp://public.example',
    'https://public.example/app',
    'https://user:pass@public.example',
    'https://public.example?mode=debug',
    'https://public.example#section',
    'https:public.example',
    'https://public.example/app/..',
    'https://public.example?',
    'https://public.example#',
    'https://@public.example',
    ' https://public.example ',
  ]) {
    it(`rejects ${origin} as a public origin at startup`, async () => {
      const fixture = await createFixture()
      const port = await getAvailablePort()

      await expectTypedStartupFailure(
        {
          port: Config.succeed(port),
          origin: Config.succeed(Option.some(origin)),
          manifestPath: fixture.manifestPath,
        },
        /^origin must be an HTTP or HTTPS origin without credentials, path, query, or fragment$/,
      )
    })
  }

  it('rejects a manifest version the adapter does not understand', async () => {
    const fixture = await createFixture({ schemaVersion: 2 })
    const port = await getAvailablePort()

    await expectTypedStartupFailure(
      {
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
      },
      /schemaVersion/,
    )
  })

  it('requires rootDirectory when the server output is outside the Vite root', async () => {
    const fixture = await createFixture({ isServerOutsideRoot: true })
    const port = await getAvailablePort()

    await expectTypedStartupFailure(
      {
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
      },
      /^foldkit\.build\.json describes a server directory outside the Vite root\. Pass rootDirectory so @foldkit\/node can locate the client output\.$/,
    )
  })

  it('rejects rootDirectory when it does not describe the manifest server output', async () => {
    const fixture = await createFixture({ isServerOutsideRoot: true })
    const port = await getAvailablePort()

    await expectTypedStartupFailure(
      {
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
        rootDirectory: join(fixture.rootDirectory, 'other'),
      },
      /^rootDirectory resolves \.\.\/runtime to .+, but the manifest is at .+$/,
    )
  })

  it('serves a moved deployment with server output outside the Vite root', async () => {
    const fixture = await createFixture({ isServerOutsideRoot: true })
    const port = await getAvailablePort()
    const fiber = Effect.runFork(
      serve({
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
        rootDirectory: fixture.rootDirectory,
      }),
    )

    try {
      const asset = await waitForResponse(
        `http://localhost:${String(port)}/asset.txt`,
      )
      expect(await asset.text()).toBe('static asset')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('serves client files only through the configured Vite base path', async () => {
    const fixture = await createFixture()
    const port = await getAvailablePort()
    const fiber = Effect.runFork(
      serve({
        port: Config.succeed(port),
        origin: Config.succeed(Option.some('https://public.example')),
        manifestPath: fixture.manifestPath,
        basePath: '/app/',
      }),
    )

    try {
      const asset = await waitForResponse(
        `http://localhost:${String(port)}/app/asset.txt`,
      )
      expect(await asset.text()).toBe('static asset')

      const outsideBasePath = await waitForResponse(
        `http://localhost:${String(port)}/asset.txt`,
      )
      expect(await outsideBasePath.text()).toBe(
        'https://public.example/asset.txt',
      )

      const index = await waitForResponse(
        `http://localhost:${String(port)}/app/index.html`,
      )
      expect(await index.text()).toBe('https://public.example/app/index.html')

      const encodedIndex = await waitForResponse(
        `http://localhost:${String(port)}/app/%69ndex.html`,
      )
      expect(await encodedIndex.text()).toBe(
        'https://public.example/app/%69ndex.html',
      )
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  for (const basePath of [
    'app/',
    '/app',
    '//localhost/app/',
    '//[invalid/',
    '/\\localhost/app/',
  ]) {
    it(`rejects ${basePath} as a Vite base path`, async () => {
      const fixture = await createFixture()
      const port = await getAvailablePort()

      await expectTypedStartupFailure(
        {
          port: Config.succeed(port),
          origin: Config.succeed(Option.none()),
          manifestPath: fixture.manifestPath,
          basePath,
        },
        /^basePath must be a root-relative path ending with `\/`$/,
      )
    })
  }

  it('does not import the application handler for an invalid base path', async () => {
    const fixture = await createFixture()
    const serverDirectory = dirname(fixture.manifestPath)
    const markerPath = join(serverDirectory, 'imported.marker')
    await copyFile(importMarkerFixtureUrl, join(serverDirectory, 'handler.mjs'))
    const port = await getAvailablePort()

    await expectTypedStartupFailure(
      {
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
        basePath: '/app',
      },
      /^basePath must be a root-relative path ending with `\/`$/,
    )
    await expect(readFile(markerPath, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('aborts the Fetch Request when a client disconnects before it responds', async () => {
    const fixture = await createFixture()
    const port = await getAvailablePort()
    const fiber = Effect.runFork(
      serve({
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
      }),
    )

    try {
      await waitForResponse(`http://localhost:${String(port)}/asset.txt`)

      const client = createConnection({ host: 'localhost', port })
      client.on('error', () => undefined)
      client.on('connect', () => {
        client.write(
          'GET /abort-pending HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n',
        )
      })

      await expect(waitForFile(fixture.abortStartedPath)).resolves.toBe(
        'started',
      )
      client.destroy()
      await expect(waitForFile(fixture.abortedPath)).resolves.toBe('aborted')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('aborts the Fetch Request when a client disconnects during a stream', async () => {
    const fixture = await createFixture()
    const port = await getAvailablePort()
    const fiber = Effect.runFork(
      serve({
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
      }),
    )

    try {
      await waitForResponse(`http://localhost:${String(port)}/asset.txt`)

      const client = createConnection({ host: 'localhost', port })
      client.on('error', () => undefined)
      const receivedResponse = new Promise<void>(resolveData => {
        client.once('data', () => {
          client.destroy()
          resolveData()
        })
      })
      client.on('connect', () => {
        client.write(
          'GET /abort-stream HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n',
        )
      })

      await expect(waitForFile(fixture.abortStartedPath)).resolves.toBe(
        'started',
      )
      await receivedResponse
      await expect(waitForFile(fixture.abortedPath)).resolves.toBe('aborted')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('cancels the Fetch response body when a client disconnects during a stream', async () => {
    const fixture = await createFixture()
    const port = await getAvailablePort()
    const fiber = Effect.runFork(
      serve({
        port: Config.succeed(port),
        origin: Config.succeed(Option.none()),
        manifestPath: fixture.manifestPath,
      }),
    )
    try {
      await waitForResponse(`http://localhost:${String(port)}/asset.txt`)

      const client = createConnection({ host: 'localhost', port })
      client.on('error', () => undefined)
      const receivedBody = new Promise<void>(resolveData => {
        let received = ''
        client.on('data', chunk => {
          received += chunk.toString()
          if (received.includes('STREAM-CHUNK')) {
            client.destroy()
            resolveData()
          }
        })
      })
      client.on('connect', () => {
        client.write(
          'GET /cancel-stream HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n',
        )
      })

      await receivedBody
      await expect(waitForFile(fixture.canceledPath)).resolves.toBe('canceled')
      client.destroy()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
