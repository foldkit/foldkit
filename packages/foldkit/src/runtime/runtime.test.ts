import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { Command } from '../command/index.js'
import { Document, html } from '../html/index.js'
import { m } from '../message/public.js'
import { type MakeRuntimeReturn, makeProgram, run } from './runtime.js'

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

const Tick = m('Tick')

const Message = S.Union([Tick])
type Message = typeof Message.Type

const init = (): readonly [Model, ReadonlyArray<Command.Command<Message>>] => [
  { count: 0 },
  [],
]

const update = (
  model: Model,
  _message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => [model, []]

const { div } = html<Message>()

const view = (model: Model): Document => ({
  title: 'Test',
  body: div([], [model.count.toString()]),
})

describe('makeProgram', () => {
  it('returns an Inactive runtime when container is null', () => {
    const program = makeProgram({
      Model,
      init,
      update,
      view,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      container: null as unknown as HTMLElement,
    })

    expect(program._tag).toBe('Inactive')
  })

  it('returns an Inactive runtime when container is undefined', () => {
    const program = makeProgram({
      Model,
      init,
      update,
      view,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      container: undefined as unknown as HTMLElement,
    })

    expect(program._tag).toBe('Inactive')
  })

  it('throws synchronously when container has no id', () => {
    const container = document.createElement('div')

    expect(() =>
      makeProgram({
        Model,
        init,
        update,
        view,
        container,
      }),
    ).toThrow(/Runtime container must have an `id`/)
  })

  it('returns an Active runtime when container has an id', () => {
    const container = document.createElement('div')
    container.id = 'app'

    const program = makeProgram({
      Model,
      init,
      update,
      view,
      container,
    })

    expect(program._tag).toBe('Active')
    if (program._tag === 'Active') {
      expect(program.runtimeId).toBe('app')
    }
  })
})

describe('run', () => {
  it('is a no-op when the program is Inactive', () => {
    const inactive: MakeRuntimeReturn = { _tag: 'Inactive' }

    expect(() => run(inactive)).not.toThrow()
  })
})
