import { Effect } from 'effect'
import { afterAll, beforeAll, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { pushUrl, replaceUrl } from './index.js'

describe('navigation history writes', () => {
  const announcedPaths: Array<string> = []
  const onUrlChangeEvent = () => {
    announcedPaths.push(window.location.pathname)
  }

  beforeAll(() => {
    window.addEventListener('foldkit:urlchange', onUrlChangeEvent)
  })

  afterAll(() => {
    window.removeEventListener('foldkit:urlchange', onUrlChangeEvent)
  })

  beforeEach(() => {
    announcedPaths.length = 0
  })

  it('pushUrl adds a history entry and announces the change', () => {
    const lengthBefore = window.history.length

    Effect.runSync(pushUrl('/pushed'))

    expect(window.location.pathname).toBe('/pushed')
    expect(window.history.length).toBe(lengthBefore + 1)
    expect(announcedPaths).toEqual(['/pushed'])
  })

  it('replaceUrl replaces the current entry and announces the change', () => {
    const lengthBefore = window.history.length

    Effect.runSync(replaceUrl('/replaced'))

    expect(window.location.pathname).toBe('/replaced')
    expect(window.history.length).toBe(lengthBefore)
    expect(announcedPaths).toEqual(['/replaced'])
  })
})
