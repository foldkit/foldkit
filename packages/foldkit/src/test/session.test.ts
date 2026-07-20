import { describe, expect, test } from 'vitest'

import { Message, Model, update } from './apps/counter.js'
import * as Story from './story.js'

// A captured session is init Model + an ordered log of entries, each carrying
// the dispatched Message, the Commands it triggered, and the resulting Model
// snapshot. These fixtures are hand-authored in the wire shape the devtools
// store serializes (`args` is `null` for argless Commands, matching
// `SerializedCommand`'s `OptionFromNullOr`).

const schemas = { Model, Message } as const

describe('fromSession', () => {
  test('lowers a pure-Message sequence into a runnable Story', () => {
    const artifact = {
      model: { count: 0, log: [] },
      entries: [
        {
          message: { _tag: 'ClickedIncrement' },
          commands: [],
          model: { count: 1, log: [] },
        },
        {
          message: { _tag: 'ClickedIncrement' },
          commands: [],
          model: { count: 2, log: [] },
        },
        {
          message: { _tag: 'ClickedDecrement' },
          commands: [],
          model: { count: 1, log: [] },
        },
      ],
    }

    Story.story(update, ...Story.fromSession(artifact, schemas))
  })

  test('wires a Command outcome from its later result-Message entry', () => {
    const artifact = {
      model: { count: 0, log: [] },
      entries: [
        {
          message: { _tag: 'ClickedFetch' },
          commands: [{ name: 'FetchCount', args: null }],
          model: { count: 0, log: [] },
        },
        {
          message: { _tag: 'SucceededFetchCount', count: 42 },
          commands: [],
          model: { count: 42, log: [42] },
        },
      ],
    }

    Story.story(update, ...Story.fromSession(artifact, schemas))
  })

  test('matches a Command with args to its result Message', () => {
    const artifact = {
      model: { count: 0, log: [] },
      entries: [
        {
          message: { _tag: 'ClickedFetchById', id: 7 },
          commands: [{ name: 'FetchCountById', args: { id: 7 } }],
          model: { count: 0, log: [] },
        },
        {
          message: { _tag: 'SucceededFetchCount', count: 7 },
          commands: [],
          model: { count: 7, log: [7] },
        },
      ],
    }

    Story.story(update, ...Story.fromSession(artifact, schemas))
  })

  test('asserts each intermediate Model, catching a recorded-snapshot drift', () => {
    const artifact = {
      model: { count: 0, log: [] },
      entries: [
        {
          message: { _tag: 'ClickedIncrement' },
          commands: [],
          model: { count: 99, log: [] },
        },
      ],
    }

    expect(() =>
      Story.story(update, ...Story.fromSession(artifact, schemas)),
    ).toThrow()
  })

  test('leaves the triggering Command unresolved when no result entry follows', () => {
    const artifact = {
      model: { count: 0, log: [] },
      entries: [
        {
          message: { _tag: 'ClickedFetch' },
          commands: [{ name: 'FetchCount', args: null }],
          model: { count: 0, log: [] },
        },
      ],
    }

    expect(() =>
      Story.story(update, ...Story.fromSession(artifact, schemas)),
    ).toThrow('I found Commands without resolvers')
  })

  test('rejects a structurally malformed artifact with a Schema decode error', () => {
    const artifact = {
      model: { count: 0, log: [] },
      entries: 'not-an-array',
    }

    expect(() => Story.fromSession(artifact, schemas)).toThrow()
  })

  test('rejects an entry whose Message does not match the app Message Schema', () => {
    const artifact = {
      model: { count: 0, log: [] },
      entries: [
        {
          message: { _tag: 'NotARealMessage' },
          commands: [],
          model: { count: 0, log: [] },
        },
      ],
    }

    expect(() => Story.fromSession(artifact, schemas)).toThrow()
  })
})
