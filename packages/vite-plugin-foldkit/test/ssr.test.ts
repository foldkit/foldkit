import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'

import { foldkitSsr } from '../src/ssr.ts'

const FIXTURE_ROOT = resolve(import.meta.dirname, 'fixtures/ssr')

const findFreePort = () =>
  new Promise<number>((resolvePort, reject) => {
    const probe = createNetServer()
    probe.on('error', error => {
      probe.close()
      reject(error)
    })
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      if (address === null || typeof address === 'string') {
        probe.close()
        reject(new Error('Could not determine a free port'))
        return
      }
      probe.close(() => resolvePort(address.port))
    })
  })

const startServer = async () => {
  const port = await findFreePort()
  const server = await createServer({
    root: FIXTURE_ROOT,
    configFile: false,
    logLevel: 'silent',
    plugins: [foldkitSsr({ serverEntry: '/entry.server.ts' })],
    server: { host: '127.0.0.1', port, strictPort: true },
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  return `http://127.0.0.1:${port}`
}

describe('foldkitSsr', () => {
  it('injects Rendered results and preserves their HTTP metadata', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    expect(response.status).toBe(203)
    expect(response.headers.get('x-rendered')).toBe('yes')
    expect(response.headers.getSetCookie()).toEqual([
      'first=1; Path=/',
      'second=2; Path=/',
    ])
    expect(await response.text()).toContain(
      '<main data-foldkit-app="app">/rendered</main>',
    )
  })

  it('passes the request body to Responded handlers', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/echo`, {
      method: 'POST',
      body: 'payload',
    })

    expect(response.status).toBe(202)
    expect(response.headers.get('x-response')).toBe('echo')
    expect(await response.text()).toBe('POST:payload')
  })

  it('passes complete redirect responses through', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/redirect`, {
      headers: { accept: 'text/html' },
      redirect: 'manual',
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${origin}/rendered`)
  })

  it('does not send a body for HEAD requests', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      method: 'HEAD',
      headers: { accept: 'text/html' },
    })

    expect(response.status).toBe(203)
    expect(await response.text()).toBe('')
  })
})
