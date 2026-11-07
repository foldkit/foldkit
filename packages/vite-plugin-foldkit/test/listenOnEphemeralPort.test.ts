import { describe, expect, it, vi } from 'vitest'

import { listenOnEphemeralPort } from './listenOnEphemeralPort.ts'

describe('ephemeral Vite server ports', () => {
  it('starts a listener once when its selected port remains available', async () => {
    const listen = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    await listenOnEphemeralPort(listen)

    expect(listen).toHaveBeenCalledOnce()
  })

  it('retries when another listener claims Vite’s selected ephemeral port', async () => {
    const listen = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('Port 42363 is already in use'))
      .mockResolvedValue(undefined)

    await listenOnEphemeralPort(listen)

    expect(listen).toHaveBeenCalledTimes(2)
  })

  it('preserves unrelated startup failures without retrying', async () => {
    const error = new Error('TLS configuration is invalid')
    const listen = vi.fn<() => Promise<void>>().mockRejectedValue(error)

    await expect(listenOnEphemeralPort(listen)).rejects.toBe(error)

    expect(listen).toHaveBeenCalledOnce()
  })

  it('preserves the final port collision after a bounded number of attempts', async () => {
    const error = new Error('Port 42363 is already in use')
    const listen = vi.fn<() => Promise<void>>().mockRejectedValue(error)

    await expect(listenOnEphemeralPort(listen)).rejects.toBe(error)

    expect(listen).toHaveBeenCalledTimes(3)
  })
})
