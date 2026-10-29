import { Array, Option, Predicate } from 'effect'
import { resolve } from 'node:path'
import { type Plugin, createServer } from 'vite'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { foldkit } from '../src/index.ts'

const startPreservationServer = async () => {
  const calls: Array<Readonly<{ name: string; handler: unknown }>> = []
  const send = vi.fn()
  const capture: Plugin = {
    name: 'capture-preservation-transport',
    enforce: 'pre',
    configureServer: server => {
      const originalOn = server.ws.on.bind(server.ws)
      vi.spyOn(server.ws, 'on').mockImplementation((name, handler) => {
        calls.push({ name, handler })
        return originalOn(name, handler)
      })
      vi.spyOn(server.ws, 'send').mockImplementation(send)
    },
  }
  const server = await createServer({
    root: resolve(import.meta.dirname, '../../../examples/counter'),
    configFile: false,
    mode: 'test',
    logLevel: 'silent',
    server: { middlewareMode: true },
    plugins: [capture, foldkit({ devToolsMcpPort: false })],
  })
  onTestFinished(() => server.close())
  await vi.waitFor(() =>
    expect(calls.some(call => call.name === 'foldkit:request-model')).toBe(
      true,
    ),
  )

  const dispatch = (name: string, payload: unknown) => {
    const { handler } = Option.getOrThrow(
      Array.findFirst(calls, call => call.name === name),
    )

    if (!Predicate.isFunction(handler)) {
      throw new Error('Missing preservation handler')
    }

    handler(payload)
  }

  return { send, dispatch }
}

describe('Vite Model preservation invalidation', () => {
  it('clears only the failing runtime and never restores its stale flushed Model', async () => {
    const { send, dispatch } = await startPreservationServer()

    dispatch('foldkit:preserve-model', {
      id: 'failed',
      model: { count: 1 },
      isReloadFlush: true,
    })
    dispatch('foldkit:preserve-model', {
      id: 'other',
      model: { count: 2 },
      isReloadFlush: true,
    })

    dispatch('foldkit:preserve-model', { id: 'failed', isReloadFlush: true })
    dispatch('foldkit:request-model', { id: 'failed' })
    await vi.waitFor(() =>
      expect(send).toHaveBeenLastCalledWith('foldkit:restore-model', {
        id: 'failed',
      }),
    )

    dispatch('foldkit:request-model', { id: 'other' })
    await vi.waitFor(() =>
      expect(send).toHaveBeenLastCalledWith('foldkit:restore-model', {
        id: 'other',
        model: { count: 2 },
      }),
    )

    dispatch('foldkit:preserve-model', {
      id: 'failed',
      model: { count: 3 },
      isReloadFlush: true,
    })
    dispatch('foldkit:request-model', { id: 'failed' })
    await vi.waitFor(() =>
      expect(send).toHaveBeenLastCalledWith('foldkit:restore-model', {
        id: 'failed',
        model: { count: 3 },
      }),
    )
  })

  it('preserves a legitimate null Model and ignores malformed invalidation payloads', async () => {
    const { send, dispatch } = await startPreservationServer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())

    dispatch('foldkit:preserve-model', {
      id: 'null',
      model: null,
      isReloadFlush: true,
    })
    dispatch('foldkit:preserve-model', { id: 'null', isReloadFlush: 'wrong' })
    dispatch('foldkit:preserve-model', { id: 1 })
    dispatch('foldkit:request-model', { id: 'null' })
    await vi.waitFor(() =>
      expect(send).toHaveBeenLastCalledWith('foldkit:restore-model', {
        id: 'null',
        model: null,
      }),
    )
  })
})
