import { Effect, Option, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeDefinition } from '../block/define.js'
import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import * as Program from './programPublic.js'
import { embed } from './start.js'

const DEPENDENCY_FAILURE = 'Cannot derive Subscription dependencies'

let container: HTMLElement

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
  container = document.createElement('div')
  container.id = 'subscription-startup'
  document.body.append(container)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('Subscription startup supervision', () => {
  it('reports initial root dependency defects and keeps the crash view until disposal', async () => {
    const Model = Schema.Struct({ count: Schema.Number })
    const Message = defineMessageUnion({ EmittedPulse: {} })
    const ApplicationDefinition = Block.makeDefinition('Application', {
      Model,
      Message,
    })
    const streamStarted = vi.fn()
    const report = vi.fn()
    const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
      pulses: entry(
        'Pulses',
        { count: Schema.Number },
        {
          messages: [Message.EmittedPulse],
          modelToDependencies: () => {
            throw new Error(DEPENDENCY_FAILURE)
          },
          handler: function* () {
            return () => {
              streamStarted()
              return Stream.never
            }
          },
        },
      ),
    }))
    const ApplicationComposition = ApplicationDefinition.makeComposition()

    const prepare = () =>
      ApplicationComposition.prepareBlock({
        init: () => ({ model: { count: 0 } }),
        update: ApplicationComposition.makeUpdate({
          EmittedPulse: model => ({ model }),
        }),
        view: ApplicationComposition.makeView((_model, h) =>
          h.div([], ['Running']),
        ),
        subscriptions,
        EffectsLayer: subscriptions.pulses.layer,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    const application = Program.makeElement({
      block: completedBlock,
      container,
      crash: {
        view: ({ error }, h) => h.div([], [error.message]),
        report,
      },
    })
    const handle = embed(application)

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe(DEPENDENCY_FAILURE)
        expect(report).toHaveBeenCalledOnce()
      })
      expect(streamStarted).not.toHaveBeenCalled()
    } finally {
      handle.dispose()
      await vi.waitFor(() => {
        expect(document.getElementById(container.id)).toBe(container)
        expect(container.textContent).toBe('')
      })
    }
  })

  it('reports dependency defects when an optional child activates after startup', async () => {
    const ChildModel = Schema.Struct({ count: Schema.Number })
    const ChildMessage = defineMessageUnion({ EmittedPulse: {} })
    const ChildDefinition = makeDefinition('StartupChild', {
      Model: ChildModel,
      Message: ChildMessage,
    })
    const streamStarted = vi.fn()
    const subscriptions = ChildDefinition.makeSubscriptions(entry => ({
      pulses: entry(
        'Pulses',
        { count: Schema.Number },
        {
          messages: [ChildMessage.EmittedPulse],
          modelToDependencies: () => {
            throw new Error(DEPENDENCY_FAILURE)
          },
          handler: function* () {
            return () => {
              streamStarted()
              return Stream.never
            }
          },
        },
      ),
    }))
    const ChildComposition = ChildDefinition.makeComposition()
    const prepareBlock = () =>
      ChildComposition.prepareBlock({
        init: () => ({ model: { count: 0 } }),
        update: ChildComposition.makeUpdate({
          EmittedPulse: model => ({ model }),
        }),
        subscriptions,
        EffectsLayer: subscriptions.pulses.layer,
      })
    const block: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof ChildModel,
      typeof prepareBlock
    > = Block.assemble(prepareBlock)
    const Model = Schema.Struct({ maybeChild: Schema.Option(ChildModel) })
    const Message = defineMessageUnion({
      ClickedActivateChild: {},
    })
    const ApplicationDefinition = Block.makeDefinition('Application', {
      Model,
      Message,
    })
    const ChildBinding = ApplicationDefinition.makeBinding(block, {
      read: model => model.maybeChild,
      write: (model, nextChild) =>
        modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
    })
    const ApplicationComposition = ApplicationDefinition.makeComposition({
      bindings: [ChildBinding],
    })
    const report = vi.fn()

    const prepare = () =>
      ApplicationComposition.prepareBlock({
        init: () => ({ model: { maybeChild: Option.none() } }),
        update: ApplicationComposition.makeUpdate({
          ClickedActivateChild: model =>
            ChildBinding.init({
              args: [],
              toParentModel: child =>
                modifyFields(model, {
                  maybeChild: () => Option.some(child),
                }),
            }),
        }),
        view: ApplicationComposition.makeView((_model, h) =>
          h.button(
            [h.Id('activate-child'), h.OnClick(Message.ClickedActivateChild())],
            ['Activate child'],
          ),
        ),
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    const application = Program.makeElement({
      block: completedBlock,
      container,
      crash: {
        view: ({ error }, h) => h.div([], [error.message]),
        report,
      },
    })
    const handle = embed(application)

    try {
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('Activate child'),
      )
      expect(report).not.toHaveBeenCalled()
      const button =
        document.querySelector<HTMLButtonElement>('#activate-child')
      if (button === null) {
        throw new Error('Missing child activation button')
      }
      button.click()

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe(DEPENDENCY_FAILURE)
        expect(report).toHaveBeenCalledOnce()
      })
      expect(streamStarted).not.toHaveBeenCalled()
    } finally {
      handle.dispose()
      await vi.waitFor(() => {
        expect(document.getElementById(container.id)).toBe(container)
        expect(container.textContent).toBe('')
      })
    }
  })
})
