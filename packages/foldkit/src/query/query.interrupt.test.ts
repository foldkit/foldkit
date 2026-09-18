import { Effect, Fiber, HashMap, Latch, Option, Result, Schema } from 'effect'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../asyncData/index.js'
import * as Interruptible from '../command/interruptible/index.js'
import { __htmlBuilder } from '../html/index.js'
import { makeElement } from '../runtime/makeElement.js'
import * as Query from './index.js'

const Note = Schema.Struct({ id: Schema.String, body: Schema.String })
type Note = typeof Note.Type

const slotKey = Schema.Unknown.pipe(
  Schema.toCodecJson,
  Schema.fromJsonString,
  Schema.encodeUnknownSync,
)

const notes = Query.define({
  name: 'Notes',
  data: Schema.Array(Note),
  error: Schema.String,
  execute: Effect.succeed([{ id: '1', body: 'hello' }]),
})

const noteById = Query.define({
  name: 'Note',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String },
  execute: function ({ noteId }) {
    return Effect.succeed({ id: noteId, body: 'hello' })
  },
})

const hello = [{ id: '1', body: 'hello' }]

const commandShape = (command: {
  readonly name: string
  readonly args?: unknown
  readonly key?: string
}) => ({
  name: command.name,
  args: command.args,
  key: command.key,
})

let container: HTMLElement

beforeEach(function () {
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(function () {
  document.body.innerHTML = ''
})

function awaitStatus(text: string) {
  return vi.waitFor(function () {
    const maybeStatus = Option.fromNullishOr(document.getElementById('status'))
    expect(
      Option.isSome(maybeStatus) ? maybeStatus.value.textContent : '',
    ).toContain(text)
  })
}

function awaitTwoAnimationFrames() {
  return new Promise<void>(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        resolve()
      })
    })
  })
}

function click(id: string) {
  const maybeButton = Option.fromNullishOr(document.getElementById(id))
  if (Option.isNone(maybeButton)) {
    throw new Error(`Missing #${id}`)
  }
  maybeButton.value.click()
}

describe('Query.define — interrupt lifecycle', function () {
  it('informReplace while pending returns Interrupt and keeps Loading', function () {
    const pending = notes.informRevalidateOrLoad(notes.init())
    const replaced = notes.informReplace(pending.model)
    expect(replaced.model).toEqual(AsyncData.Loading())
    expect(replaced.commands?.map(commandShape)).toEqual([
      commandShape(
        notes.Fetch.Interrupt(function (outcome) {
          return notes.Message.CompletedCancelFetch({
            outcome,
            intent: Query.CancelIntent.Replace(),
          })
        }),
      ),
    ])
  })

  it('CompletedCancelFetch Interrupted restarts Fetch on a pending Query', function () {
    const pending = notes.informRevalidateOrLoad(notes.init())
    const restarted = notes.update(
      pending.model,
      notes.Message.CompletedCancelFetch({
        outcome: Interruptible.Outcome.Interrupted(),
        intent: Query.CancelIntent.Replace(),
      }),
    )
    expect(restarted.model).toEqual(AsyncData.Loading())
    expect(restarted.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch()),
    ])
  })

  it('CompletedCancelFetch NotFound on Idle is a no-op', function () {
    const started = notes.update(
      notes.init(),
      notes.Message.CompletedCancelFetch({
        outcome: Interruptible.Outcome.NotFound(),
        intent: Query.CancelIntent.Replace(),
      }),
    )
    expect(started.model).toEqual(AsyncData.Idle())
    expect(started.commands).toBeUndefined()
  })

  it('CompletedCancelFetch NotFound on a pending Query does not start Fetch', function () {
    const pending = notes.informRevalidateOrLoad(notes.init())
    const next = notes.update(
      pending.model,
      notes.Message.CompletedCancelFetch({
        outcome: Interruptible.Outcome.NotFound(),
        intent: Query.CancelIntent.Replace(),
      }),
    )
    expect(next.model).toEqual(AsyncData.Loading())
    expect(next.commands).toBeUndefined()
  })

  it('CompletedCancelFetch NotFound on Success does not start Fetch', function () {
    const success = notes.update(
      AsyncData.Loading(),
      notes.Message.SettledFetch({ result: Result.succeed(hello) }),
    )
    const next = notes.update(
      success.model,
      notes.Message.CompletedCancelFetch({
        outcome: Interruptible.Outcome.NotFound(),
        intent: Query.CancelIntent.Replace(),
      }),
    )
    expect(next.model).toEqual(AsyncData.Success({ data: hello }))
    expect(next.commands).toBeUndefined()
  })

  it('replace through the Runtime interrupts the first fetch and settles the reload', async function () {
    let attempts = 0
    const deferredNotes = Query.define({
      name: 'DeferredNotes',
      data: Schema.Array(Note),
      error: Schema.String,
      execute: Effect.suspend(function () {
        attempts += 1
        if (attempts === 1) {
          return Effect.never
        }
        return Effect.succeed(hello)
      }),
    })
    const h = __htmlBuilder<(typeof deferredNotes.Message)['Type']>()

    const element = makeElement({
      Model: deferredNotes.Model,
      init: function () {
        return deferredNotes.informRevalidateOrLoad(deferredNotes.init())
      },
      update: deferredNotes.update,
      view: function (model) {
        return h.div(
          [],
          [
            h.div([h.Id('status')], [model._tag]),
            h.button(
              [
                h.Id('replace'),
                h.OnClick(deferredNotes.Message.RequestedReplace()),
              ],
              ['replace'],
            ),
          ],
        )
      },
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitStatus('Loading')
      await awaitTwoAnimationFrames()
      click('replace')
      await awaitStatus('Success')
      expect(attempts).toBe(2)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('NotFound while a Fetch is in flight lets that Fetch settle and does not start another', async function () {
    let attempts = 0
    const latch = Latch.makeUnsafe()
    const latchedNotes = Query.define({
      name: 'LatchedNotes',
      data: Schema.Array(Note),
      error: Schema.String,
      execute: Effect.suspend(function () {
        attempts += 1
        return Effect.gen(function* () {
          yield* latch.await
          return hello
        })
      }),
    })
    const h = __htmlBuilder<(typeof latchedNotes.Message)['Type']>()

    const element = makeElement({
      Model: latchedNotes.Model,
      init: function () {
        return latchedNotes.informRevalidateOrLoad(latchedNotes.init())
      },
      update: latchedNotes.update,
      view: function (model) {
        return h.div(
          [],
          [
            h.div([h.Id('status')], [model._tag]),
            h.button(
              [
                h.Id('not-found'),
                h.OnClick(
                  latchedNotes.Message.CompletedCancelFetch({
                    outcome: Interruptible.Outcome.NotFound(),
                    intent: Query.CancelIntent.Replace(),
                  }),
                ),
              ],
              ['not-found'],
            ),
          ],
        )
      },
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitStatus('Loading')
      await awaitTwoAnimationFrames()
      click('not-found')
      const maybeStatus = Option.fromNullishOr(
        document.getElementById('status'),
      )
      expect(
        Option.isSome(maybeStatus) ? maybeStatus.value.textContent : undefined,
      ).toBe('Loading')
      Effect.runSync(latch.open)
      await awaitStatus('Success')
      expect(attempts).toBe(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('Interrupted with forget does not start Fetch after re-watch', function () {
    const pending = notes.informRevalidateOrLoad(notes.init())
    const forgotten = notes.informForget(pending.model)
    const watching = notes.informWatch(forgotten.model)
    expect(watching.model).toEqual(AsyncData.Loading())
    const next = notes.update(
      watching.model,
      notes.Message.CompletedCancelFetch({
        outcome: Interruptible.Outcome.Interrupted(),
        intent: Query.CancelIntent.Forget(),
      }),
    )
    expect(next.model).toEqual(AsyncData.Loading())
    expect(next.commands).toBeUndefined()
  })

  it('forget then watch through the Runtime does not start a third Fetch', async function () {
    let attempts = 0
    const deferredNotes = Query.define({
      name: 'ForgetRewatchNotes',
      data: Schema.Array(Note),
      error: Schema.String,
      execute: Effect.suspend(function () {
        attempts += 1
        if (attempts === 1) {
          return Effect.never
        }
        return Effect.succeed(hello)
      }),
    })
    const h = __htmlBuilder<(typeof deferredNotes.Message)['Type']>()

    const element = makeElement({
      Model: deferredNotes.Model,
      init: function () {
        return deferredNotes.informRevalidateOrLoad(deferredNotes.init())
      },
      update: deferredNotes.update,
      view: function (model) {
        return h.div(
          [],
          [
            h.div([h.Id('status')], [model._tag]),
            h.button(
              [
                h.Id('forget'),
                h.OnClick(deferredNotes.Message.RequestedForget()),
              ],
              ['forget'],
            ),
            h.button(
              [
                h.Id('watch'),
                h.OnClick(deferredNotes.Message.RequestedWatch()),
              ],
              ['watch'],
            ),
          ],
        )
      },
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitStatus('Loading')
      await awaitTwoAnimationFrames()
      click('forget')
      click('watch')
      await awaitStatus('Success')
      expect(attempts).toBe(2)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})

describe('Query.define KeyedQuery — interrupt lifecycle', function () {
  it('replace while pending returns Interrupt for that key only', function () {
    const pendingOne = noteById.informLoadIfMissing(noteById.init(), {
      noteId: '1',
    })
    const bothPending = noteById.informLoadIfMissing(pendingOne.model, {
      noteId: '2',
    })
    const replaced = noteById.informReplace(bothPending.model, { noteId: '1' })
    expect(noteById.read(replaced.model, { noteId: '1' })).toEqual(
      AsyncData.Loading(),
    )
    expect(noteById.read(replaced.model, { noteId: '2' })).toEqual(
      AsyncData.Loading(),
    )
    expect(replaced.commands?.map(commandShape)).toEqual([
      commandShape(
        noteById.Fetch.Interrupt({ noteId: '1' }, function (outcome) {
          return noteById.Message.CompletedCancelFetch({
            args: { noteId: '1' },
            outcome,
            intent: Query.CancelIntent.Replace(),
          })
        }),
      ),
    ])
  })

  it('CompletedCancelFetch Interrupted restarts Fetch on a pending key', function () {
    const pending = noteById.informLoadIfMissing(noteById.init(), {
      noteId: '1',
    })
    const restarted = noteById.update(
      pending.model,
      noteById.Message.CompletedCancelFetch({
        args: { noteId: '1' },
        outcome: Interruptible.Outcome.Interrupted(),
        intent: Query.CancelIntent.Replace(),
      }),
    )
    expect(noteById.read(restarted.model, { noteId: '1' })).toEqual(
      AsyncData.Loading(),
    )
    expect(restarted.commands?.map(commandShape)).toEqual([
      commandShape(noteById.Fetch({ noteId: '1' })),
    ])
  })

  it('CompletedCancelFetch NotFound on a missing key is a no-op', function () {
    const started = noteById.update(
      noteById.init(),
      noteById.Message.CompletedCancelFetch({
        args: { noteId: '1' },
        outcome: Interruptible.Outcome.NotFound(),
        intent: Query.CancelIntent.Replace(),
      }),
    )
    expect(HashMap.isEmpty(started.model)).toBe(true)
    expect(started.commands).toBeUndefined()
  })

  it('CompletedCancelFetch NotFound on a pending key does not start Fetch', function () {
    const pending = noteById.informLoadIfMissing(noteById.init(), {
      noteId: '1',
    })
    const next = noteById.update(
      pending.model,
      noteById.Message.CompletedCancelFetch({
        args: { noteId: '1' },
        outcome: Interruptible.Outcome.NotFound(),
        intent: Query.CancelIntent.Replace(),
      }),
    )
    expect(noteById.read(next.model, { noteId: '1' })).toEqual(
      AsyncData.Loading(),
    )
    expect(next.commands).toBeUndefined()
  })
})

describe('Query.define — watch and forget', function () {
  it('informForget while pending writes Idle and returns Interrupt', function () {
    const pending = notes.informLoadIfMissing(notes.init())
    const forgotten = notes.informForget(pending.model)
    expect(forgotten.model).toEqual(AsyncData.Idle())
    expect(forgotten.commands?.map(commandShape)).toEqual([
      commandShape(
        notes.Fetch.Interrupt(function (outcome) {
          return notes.Message.CompletedCancelFetch({
            outcome,
            intent: Query.CancelIntent.Forget(),
          })
        }),
      ),
    ])
  })

  it('SettledFetch after forget does not resurrect Idle; after re-watch it writes', function () {
    const pending = notes.informLoadIfMissing(notes.init())
    const forgotten = notes.informForget(pending.model)
    const late = notes.update(
      forgotten.model,
      notes.Message.SettledFetch({ result: Result.succeed(hello) }),
    )
    expect(late.model).toEqual(AsyncData.Idle())

    const watching = notes.informWatch(late.model)
    expect(watching.model).toEqual(AsyncData.Loading())
    const settled = notes.update(
      watching.model,
      notes.Message.SettledFetch({ result: Result.succeed(hello) }),
    )
    expect(settled.model).toEqual(AsyncData.Success({ data: hello }))
  })
})

describe('Query.define KeyedQuery — watch and forget', function () {
  it('informWatch from [1, 2] then [1] drops key 2 and Interrupts the pending fetch', function () {
    const both = noteById.informWatch(noteById.init(), [
      { noteId: '1' },
      { noteId: '2' },
    ])
    expect(noteById.read(both.model, { noteId: '1' })).toEqual(
      AsyncData.Loading(),
    )
    expect(noteById.read(both.model, { noteId: '2' })).toEqual(
      AsyncData.Loading(),
    )
    expect(both.commands?.map(commandShape)).toEqual([
      commandShape(noteById.Fetch({ noteId: '1' })),
      commandShape(noteById.Fetch({ noteId: '2' })),
    ])

    const onlyOne = noteById.informWatch(both.model, [{ noteId: '1' }])
    expect(noteById.read(onlyOne.model, { noteId: '1' })).toEqual(
      AsyncData.Loading(),
    )
    expect(HashMap.get(onlyOne.model, slotKey({ noteId: '2' }))).toEqual(
      Option.none(),
    )
    expect(onlyOne.commands?.map(commandShape)).toEqual([
      commandShape(
        noteById.Fetch.Interrupt({ noteId: '2' }, function (outcome) {
          return noteById.Message.CompletedCancelFetch({
            args: { noteId: '2' },
            outcome,
            intent: Query.CancelIntent.Forget(),
          })
        }),
      ),
    ])
  })

  it('informForget while pending removes the key and returns Interrupt', function () {
    const pending = noteById.informLoadIfMissing(noteById.init(), {
      noteId: '2',
    })
    const forgotten = noteById.informForget(pending.model, { noteId: '2' })
    expect(HashMap.get(forgotten.model, slotKey({ noteId: '2' }))).toEqual(
      Option.none(),
    )
    expect(forgotten.commands?.map(commandShape)).toEqual([
      commandShape(
        noteById.Fetch.Interrupt({ noteId: '2' }, function (outcome) {
          return noteById.Message.CompletedCancelFetch({
            args: { noteId: '2' },
            outcome,
            intent: Query.CancelIntent.Forget(),
          })
        }),
      ),
    ])
  })

  it('SettledFetch after forget does not reinsert the key', function () {
    const pending = noteById.informLoadIfMissing(noteById.init(), {
      noteId: '1',
    })
    const forgotten = noteById.informForget(pending.model, { noteId: '1' })
    const late = noteById.update(
      forgotten.model,
      noteById.Message.SettledFetch({
        args: { noteId: '1' },
        result: Result.succeed({ id: '1', body: 'hello' }),
      }),
    )
    expect(HashMap.get(late.model, slotKey({ noteId: '1' }))).toEqual(
      Option.none(),
    )
    expect(HashMap.isEmpty(late.model)).toBe(true)
  })

  it('SettledFetch after watch-drop does not reinsert; after re-watch it writes', function () {
    const both = noteById.informWatch(noteById.init(), [
      { noteId: '1' },
      { noteId: '2' },
    ])
    const dropped = noteById.informWatch(both.model, [{ noteId: '1' }])
    const late = noteById.update(
      dropped.model,
      noteById.Message.SettledFetch({
        args: { noteId: '2' },
        result: Result.succeed({ id: '2', body: 'hello' }),
      }),
    )
    expect(HashMap.get(late.model, slotKey({ noteId: '2' }))).toEqual(
      Option.none(),
    )

    const rewatched = noteById.informWatch(late.model, [
      { noteId: '1' },
      { noteId: '2' },
    ])
    expect(noteById.read(rewatched.model, { noteId: '2' })).toEqual(
      AsyncData.Loading(),
    )
    const settled = noteById.update(
      rewatched.model,
      noteById.Message.SettledFetch({
        args: { noteId: '2' },
        result: Result.succeed({ id: '2', body: 'hello' }),
      }),
    )
    expect(noteById.read(settled.model, { noteId: '2' })).toEqual(
      AsyncData.Success({ data: { id: '2', body: 'hello' } }),
    )
  })
})

describe('Query.define KeyedQuery — Runtime interrupt', function () {
  it('replace through the Runtime interrupts one slot and leaves the sibling pending', async function () {
    const attempts: globalThis.Record<string, number> = {}
    const deferredNotes = Query.define({
      name: 'DeferredNote',
      data: Note,
      error: Schema.String,
      args: { noteId: Schema.String },
      execute: function ({ noteId }) {
        return Effect.suspend(function () {
          attempts[noteId] = (attempts[noteId] ?? 0) + 1
          if (attempts[noteId] === 1) {
            return Effect.never
          }
          return Effect.succeed({ id: noteId, body: 'hello' })
        })
      },
    })
    const h = __htmlBuilder<(typeof deferredNotes.Message)['Type']>()

    const element = makeElement({
      Model: deferredNotes.Model,
      init: function () {
        return deferredNotes.informWatch(deferredNotes.init(), [
          { noteId: '1' },
          { noteId: '2' },
        ])
      },
      update: deferredNotes.update,
      view: function (model) {
        const first = deferredNotes.read(model, { noteId: '1' })
        const second = deferredNotes.read(model, { noteId: '2' })
        return h.div(
          [],
          [
            h.div([h.Id('status')], [`${first._tag} ${second._tag}`]),
            h.button(
              [
                h.Id('replace-1'),
                h.OnClick(
                  deferredNotes.Message.RequestedReplace({
                    args: { noteId: '1' },
                  }),
                ),
              ],
              ['replace-1'],
            ),
          ],
        )
      },
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitStatus('Loading Loading')
      await awaitTwoAnimationFrames()
      click('replace-1')
      await awaitStatus('Success Loading')
      expect(attempts['1']).toBe(2)
      expect(attempts['2']).toBe(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('watch-drop then re-watch through the Runtime does not start a third Fetch', async function () {
    const attempts: globalThis.Record<string, number> = {}
    const deferredNotes = Query.define({
      name: 'ForgetRewatchNote',
      data: Note,
      error: Schema.String,
      args: { noteId: Schema.String },
      execute: function ({ noteId }) {
        return Effect.suspend(function () {
          attempts[noteId] = (attempts[noteId] ?? 0) + 1
          if (attempts[noteId] === 1) {
            return Effect.never
          }
          return Effect.succeed({ id: noteId, body: 'hello' })
        })
      },
    })
    const h = __htmlBuilder<(typeof deferredNotes.Message)['Type']>()

    const element = makeElement({
      Model: deferredNotes.Model,
      init: function () {
        return deferredNotes.informWatch(deferredNotes.init(), [
          { noteId: '1' },
        ])
      },
      update: deferredNotes.update,
      view: function (model) {
        const first = deferredNotes.read(model, { noteId: '1' })
        return h.div(
          [],
          [
            h.div([h.Id('status')], [first._tag]),
            h.button(
              [
                h.Id('drop'),
                h.OnClick(
                  deferredNotes.Message.RequestedWatch({
                    live: HashMap.empty(),
                  }),
                ),
              ],
              ['drop'],
            ),
            h.button(
              [
                h.Id('rewatch'),
                h.OnClick(
                  deferredNotes.Message.RequestedWatch({
                    live: HashMap.make([
                      slotKey({ noteId: '1' }),
                      { noteId: '1' },
                    ]),
                  }),
                ),
              ],
              ['rewatch'],
            ),
          ],
        )
      },
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitStatus('Loading')
      await awaitTwoAnimationFrames()
      click('drop')
      click('rewatch')
      await awaitStatus('Success')
      expect(attempts['1']).toBe(2)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
