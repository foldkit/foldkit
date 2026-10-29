import { Option, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import {
  type SlowContext,
  __resolveSlowConfig,
  defaultSlowCallback,
  reportSlowPhase,
} from './slowPhase.js'

const Model = Schema.Struct({ data: Schema.String })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ReceivedApiData: { data: Schema.String },
})
type Message = typeof Message.Type

const model = Model.make({ data: 'large API response'.repeat(100) })
const message = Message.ReceivedApiData({ data: model.data })
const timing = { durationMs: 20.25, thresholdMs: 8 }

const warningCases: ReadonlyArray<
  readonly [SlowContext<unknown, unknown>, string]
> = [
  [
    { _tag: 'View', model, message: Option.some(message), ...timing },
    'Slow view: 20.3ms (budget: 8ms), triggered by ReceivedApiData. Keep render-only work in the view path and memoize expensive subtrees with createLazy or createKeyedLazy.',
  ],
  [
    { _tag: 'View', model, message: Option.none(), ...timing },
    'Slow view: 20.3ms (budget: 8ms), triggered by init. Keep render-only work in the view path and memoize expensive subtrees with createLazy or createKeyedLazy.',
  ],
  [
    {
      _tag: 'Update',
      previousModel: model,
      nextModel: model,
      message,
      ...timing,
    },
    'Slow update: 20.3ms (budget: 8ms), triggered by ReceivedApiData. Inspect the triggering Message branch; move render-only derivations to memoized views and keep update focused on state transitions.',
  ],
  [
    { _tag: 'Patch', model, message: Option.some(message), ...timing },
    'Slow patch: 20.3ms (budget: 8ms), triggered by ReceivedApiData. Key mapped lists by stable ids, split large views, or memoize stable subtrees with createLazy.',
  ],
  [
    { _tag: 'Patch', model, message: Option.none(), ...timing },
    'Slow patch: 20.3ms (budget: 8ms), triggered by init. Key mapped lists by stable ids, split large views, or memoize stable subtrees with createLazy.',
  ],
  [
    {
      _tag: 'SubscriptionDependencies',
      model,
      subscriptionKey: 'apiData',
      ...timing,
    },
    'Slow subscription dependencies: 20.3ms (budget: 8ms) for subscription "apiData". Keep modelToDependencies a cheap projection from modeled fields; avoid scans, sorting, serialization, and large dependency objects.',
  ],
  [
    {
      _tag: 'View',
      model,
      message: Option.some({ data: model.data }),
      ...timing,
    },
    'Slow view: 20.3ms (budget: 8ms), triggered by unknown. Keep render-only work in the view path and memoize expensive subtrees with createLazy or createKeyedLazy.',
  ],
]

describe('defaultSlowCallback', () => {
  it.each(warningCases)('logs only a summary (case %#)', (context, summary) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      defaultSlowCallback(context)

      expect(warn).toHaveBeenCalledExactlyOnceWith(
        `[foldkit] ${summary} Set slow.thresholdOverrides to change budgets or pass slow: false to disable warnings.`,
      )
    } finally {
      warn.mockRestore()
    }
  })
})

describe('custom onSlow', () => {
  it('receives the full typed context without logging a default warning', () => {
    const onSlow = vi.fn<(context: SlowContext<Model, Message>) => void>()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const resolved = Option.getOrThrow(
      __resolveSlowConfig<Model, Message>({ onSlow }, () => true),
    )
    const context: SlowContext<Model, Message> = {
      _tag: 'Update',
      previousModel: model,
      nextModel: Model.make({ data: 'next API response' }),
      message,
      durationMs: 20.25,
      thresholdMs: 4,
    }

    try {
      reportSlowPhase(
        resolved.update,
        Option.some(context.durationMs),
        () => context,
      )

      expect(onSlow).toHaveBeenCalledExactlyOnceWith(context)
      expect(onSlow.mock.calls.at(0)?.at(0)).toBe(context)
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })
})
