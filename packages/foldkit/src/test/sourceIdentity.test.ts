import { Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { define } from '../block/define.js'
import { qualifyCommand, qualifyEntry } from '../block/scope.js'
import * as Command from '../command/index.js'
import type { HtmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import * as Subscription from '../subscription/subscription.js'
import {
  type BaseInternal,
  assertHasCommands,
  assertHasMounts,
  resolveAllInternal,
} from './internal.js'
import * as Scene from './scene.js'

const Message = defineMessageUnion({ CompletedRead: { value: Schema.Number } })
const FirstCommand = Command.define('SharedRead', {
  messages: [Message.CompletedRead],
})
const SecondCommand = Command.define('SharedRead', {
  messages: [Message.CompletedRead],
})
const FirstMount = Mount.define('SharedObserve', {
  messages: [Message.CompletedRead],
})
const SecondMount = Mount.define('SharedObserve', {
  messages: [Message.CompletedRead],
})

const Model = Schema.Struct({ value: Schema.Number })
const First = define('SharedFeature')
const Second = define('SharedFeature')
const first = First.define({ Model, Message })
const second = Second.define({ Model, Message })
const subscriptions = first.subscriptions(entry => ({
  values: entry('Values', { messages: [Message.CompletedRead] }),
}))
const otherSubscriptions = second.subscriptions(entry => ({
  values: entry('Values', { messages: [Message.CompletedRead] }),
}))
const lifted = Subscription.lift(subscriptions)<
  typeof Model.Type,
  typeof Message.Type
>({
  read: model => Option.some(model),
  toParentMessage: message => message,
})
const left = qualifyEntry('Left', lifted.values)
const right = qualifyEntry('Right', lifted.values)
const update = (_model: typeof Model.Type, { value }: typeof Message.Type) => ({
  model: { value },
})
const view = (model: typeof Model.Type, h: HtmlBuilder<typeof Message.Type>) =>
  h.div([h.Role('status')], [globalThis.String(model.value)])

describe('test operation source identity', () => {
  it('distinguishes same-named Command definitions and bound occurrences', () => {
    const pending = qualifyCommand('Left', FirstCommand())
    expect(() => assertHasCommands([pending], [FirstCommand])).not.toThrow()
    expect(() => assertHasCommands([pending], [SecondCommand])).toThrow(
      'Expected to find Commands',
    )
    expect(() =>
      assertHasCommands([pending], [qualifyCommand('Right', FirstCommand())]),
    ).toThrow('Expected to find Commands')
  })

  it('retains separate cached resolvers for same-named definitions', () => {
    const initial: BaseInternal<typeof Model.Type, typeof Message.Type> = {
      model: { value: 0 },
      message: undefined,
      // eslint-disable-next-line foldkit/no-empty-commands-array
      commands: [],
      outMessage: undefined,
      updateFn: update,
      resolvers: [],
    }
    const first = resolveAllInternal(initial, [
      [FirstCommand, Message.CompletedRead({ value: 1 })],
    ])
    const both = resolveAllInternal(first, [
      [SecondCommand, Message.CompletedRead({ value: 2 })],
    ])
    const resolved = resolveAllInternal(
      { ...both, commands: [FirstCommand(), SecondCommand()] },
      [],
    )
    expect(resolved.commands).toEqual([])
    expect(resolved.model.value).toBe(2)
  })

  it('distinguishes same-named Mount definitions', () => {
    const pending = { ...FirstMount(), occurrence: 0 }
    expect(() => assertHasMounts([pending], [FirstMount])).not.toThrow()
    expect(() => assertHasMounts([pending], [SecondMount])).toThrow(
      'Expected to find Mounts',
    )
  })

  it('accepts a source after lifting and selects an explicitly bound registration', () => {
    Scene.scene(
      { update, view, subscriptions: { left } },
      Scene.given({ value: 0 }),
      Scene.Subscription.emit(
        subscriptions.values,
        Message.CompletedRead({ value: 1 }),
      ),
      Scene.expect(Scene.role('status')).toHaveText('1'),
    )
    Scene.scene(
      { update, view, subscriptions: { left, right } },
      Scene.given({ value: 0 }),
      Scene.Subscription.emit(right, Message.CompletedRead({ value: 2 })),
      Scene.expect(Scene.role('status')).toHaveText('2'),
    )
  })

  it('rejects a same-named unrelated Subscription and an ambiguous reused source', () => {
    expect(() =>
      Scene.scene(
        { update, view, subscriptions: { left } },
        Scene.given({ value: 0 }),
        Scene.Subscription.emit(
          otherSubscriptions.values,
          Message.CompletedRead({ value: 1 }),
        ),
      ),
    ).toThrow('not declared by the selected Subscription')
    expect(() =>
      Scene.scene(
        { update, view, subscriptions: { left, right } },
        Scene.given({ value: 0 }),
        Scene.Subscription.emit(
          subscriptions.values,
          Message.CompletedRead({ value: 1 }),
        ),
      ),
    ).toThrow('Select the bound Subscription entry')
  })
})
