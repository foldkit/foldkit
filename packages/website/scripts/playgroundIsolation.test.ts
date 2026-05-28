import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { stackBlitzPlaygroundEmbedOptions } from '../src/page/playgroundConfig'

const PLAYGROUND_ROUTE_SOURCE = '/playground/(.*)'

type VercelConfig = {
  headers?: ReadonlyArray<{
    source: string
    headers: ReadonlyArray<{
      key: string
      value: string
    }>
  }>
}

describe('playground StackBlitz isolation', () => {
  it('keeps the WebContainer embed opt-in and Vercel headers together', () => {
    const vercelConfig: VercelConfig = JSON.parse(
      readFileSync(resolve(process.cwd(), '../../vercel.json'), 'utf8'),
    )
    const playgroundHeaders =
      vercelConfig.headers?.find(
        rule => rule.source === PLAYGROUND_ROUTE_SOURCE,
      )?.headers ?? []

    expect(stackBlitzPlaygroundEmbedOptions.crossOriginIsolated).toBe(true)
    expect(playgroundHeaders).toContainEqual({
      key: 'Cross-Origin-Embedder-Policy',
      value: 'require-corp',
    })
    expect(playgroundHeaders).toContainEqual({
      key: 'Cross-Origin-Opener-Policy',
      value: 'same-origin',
    })
  })
})
