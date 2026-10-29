import {
  Array,
  Effect,
  Equivalence,
  Number,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeDefinition } from '../block/define.js'
import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Scene from '../test/scene.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import * as Program from './programPublic.js'
import { embed } from './start.js'

let container: HTMLElement

beforeEach(() => {
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
  container = document.createElement('div')
  container.id = 'subscription-gate'
  document.body.append(container)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const clickButton = (id: string): void => {
  const button = document.querySelector<HTMLButtonElement>(`#${id}`)
  if (button === null) {
    throw new Error(`Missing ${id} button`)
  }
  button.click()
}

const clickToggle = (): void => clickButton('toggle')

describe('Subscription when gate', () => {
  it('runs the Stream only while the gate is open and skips the projection while closed', async () => {
    const Model = Schema.Struct({
      isOpen: Schema.Boolean,
      label: Schema.String,
    })
    type Model = typeof Model.Type
    const Message = defineMessageUnion({ ClickedToggle: {}, EmittedPulse: {} })
    type Message = typeof Message.Type
    const ApplicationDefinition = Block.makeDefinition('Application', {
      Model,
      Message,
    })
    const projectedLabels: Array<string> = []
    const startedLabels: Array<string> = []
    const streamEnded = vi.fn()
    const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
      pulses: entry(
        'Pulses',
        { label: Schema.String },
        {
          messages: [Message.EmittedPulse],
          when: model => model.isOpen,
          modelToDependencies: model => {
            projectedLabels.push(model.label)
            return { label: model.label }
          },
          handler: function* () {
            return ({ label }) =>
              Stream.never.pipe(
                Stream.onStart(
                  Effect.sync(() => {
                    startedLabels.push(label)
                  }),
                ),
                Stream.ensuring(Effect.sync(streamEnded)),
              )
          },
        },
      ),
    }))
    const ApplicationComposition = ApplicationDefinition.makeComposition()

    const prepare = () =>
      ApplicationComposition.prepareBlock({
        init: ApplicationComposition.makeInit(() => ({
          model: { isOpen: false, label: 'card' },
        })),
        update: ApplicationComposition.makeUpdate({
          ClickedToggle: model => ({
            model: modifyFields(model, { isOpen: isOpen => !isOpen }),
          }),
          EmittedPulse: model => ({ model }),
        }),
        view: ApplicationComposition.makeView((model, h) =>
          h.button(
            [h.Id('toggle'), h.OnClick(Message.ClickedToggle())],
            [model.isOpen ? 'Open' : 'Closed'],
          ),
        ),
        subscriptions,
        EffectsLayer: subscriptions.layer,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    const handle = embed(
      Program.makeElement({ block: completedBlock, container }),
    )

    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Closed'))
      expect(projectedLabels).toEqual([])
      expect(startedLabels).toEqual([])

      clickToggle()

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('Open')
        expect(startedLabels).toEqual(['card'])
      })
      expect(streamEnded).not.toHaveBeenCalled()

      clickToggle()

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('Closed')
        expect(streamEnded).toHaveBeenCalledOnce()
      })
      expect(startedLabels).toEqual(['card'])
      expect(projectedLabels).toEqual(['card'])
    } finally {
      handle.dispose()
    }
  })

  it('agrees with Scene for a child Block entry under a Binding', async () => {
    const ChildModel = Schema.Struct({ isOpen: Schema.Boolean })
    type ChildModel = typeof ChildModel.Type
    const ChildMessage = defineMessageUnion({
      ClickedToggle: {},
      EmittedPulse: {},
    })
    type ChildMessage = typeof ChildMessage.Type
    const ChildDefinition = makeDefinition('GatedChild', {
      Model: ChildModel,
      Message: ChildMessage,
    })
    const streamStarted = vi.fn()
    const streamEnded = vi.fn()
    const childSubscriptions = ChildDefinition.makeSubscriptions(entry => ({
      pulses: entry('Pulses', {
        messages: [ChildMessage.EmittedPulse],
        when: model => model.isOpen,
        handler: function* () {
          return () =>
            Stream.never.pipe(
              Stream.onStart(Effect.sync(streamStarted)),
              Stream.ensuring(Effect.sync(streamEnded)),
            )
        },
      }),
    }))
    const ChildComposition = ChildDefinition.makeComposition()
    const prepareChild = () =>
      ChildComposition.prepareBlock({
        init: ChildComposition.makeInit(() => ({ model: { isOpen: false } })),
        update: ChildComposition.makeUpdate({
          ClickedToggle: model => ({
            model: modifyFields(model, { isOpen: isOpen => !isOpen }),
          }),
          EmittedPulse: model => ({ model }),
        }),
        view: ChildComposition.makeView((model, h) =>
          h.button(
            [h.Id('toggle'), h.OnClick(ChildMessage.ClickedToggle())],
            [model.isOpen ? 'Open' : 'Closed'],
          ),
        ),
        subscriptions: childSubscriptions,
        EffectsLayer: childSubscriptions.layer,
      })
    const ChildBlock: Block.FromAssemblyWithView<
      typeof ChildModel,
      typeof prepareChild
    > = Block.assemble(prepareChild)

    const Model = Schema.Struct({ child: ChildBlock.Model })
    type Model = typeof Model.Type
    const Message = defineMessageUnion({ ClickedNothing: {} })
    type Message = typeof Message.Type
    const ApplicationDefinition = Block.makeDefinition('Application', {
      Model,
      Message,
    })
    const ChildBinding = ApplicationDefinition.makeBinding(ChildBlock, {
      field: 'child',
      init: true,
    })
    const ApplicationComposition = ApplicationDefinition.makeComposition({
      bindings: [ChildBinding],
    })
    const update = ApplicationComposition.makeUpdate({
      ClickedNothing: model => ({ model }),
    })
    const view = ApplicationComposition.makeView((model, h) =>
      h.block(ChildBinding.embedView({ slotId: 'child', model: model.child })),
    )
    const initialModel = Model.make({ child: { isOpen: false } })

    Scene.scene(
      {
        update,
        view,
        subscriptions: Scene.subscriptions(ApplicationComposition),
      },
      Scene.given(initialModel),
      Scene.Subscription.expectInactive(childSubscriptions.pulses),
      Scene.click(Scene.role('button', { name: 'Closed' })),
      Scene.Subscription.expectActive(childSubscriptions.pulses),
      Scene.click(Scene.role('button', { name: 'Open' })),
      Scene.Subscription.expectInactive(childSubscriptions.pulses),
    )

    const prepare = () =>
      ApplicationComposition.prepareBlock({
        init: ApplicationComposition.makeInit(() => ({ model: {} })),
        update,
        view,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    const handle = embed(
      Program.makeElement({ block: completedBlock, container }),
    )

    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Closed'))
      expect(streamStarted).not.toHaveBeenCalled()

      clickToggle()

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('Open')
        expect(streamStarted).toHaveBeenCalledOnce()
      })
      expect(streamEnded).not.toHaveBeenCalled()

      clickToggle()

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('Closed')
        expect(streamEnded).toHaveBeenCalledOnce()
      })
      expect(streamStarted).toHaveBeenCalledOnce()
    } finally {
      handle.dispose()
    }
  })

  it('keeps a keep-alive Stream running behind an open gate and restarts it after reopening', async () => {
    const Model = Schema.Struct({
      isOpen: Schema.Boolean,
      position: Schema.Number,
    })
    type Model = typeof Model.Type
    const Message = defineMessageUnion({
      ClickedToggle: {},
      ClickedMove: {},
      EmittedPulse: {},
    })
    type Message = typeof Message.Type
    const ApplicationDefinition = Block.makeDefinition('Application', {
      Model,
      Message,
    })
    const streamStarted = vi.fn()
    const streamEnded = vi.fn()
    const readDependenciesCalls: Array<() => { position: number }> = []
    const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
      pulses: entry(
        'Pulses',
        { position: Schema.Number },
        {
          messages: [Message.EmittedPulse],
          when: model => model.isOpen,
          modelToDependencies: model => ({ position: model.position }),
          keepAliveEquivalence: Equivalence.make(() => true),
          handler: function* () {
            return (_dependencies, readDependencies) =>
              Stream.never.pipe(
                Stream.onStart(
                  Effect.sync(() => {
                    streamStarted()
                    readDependenciesCalls.push(readDependencies)
                  }),
                ),
                Stream.ensuring(Effect.sync(streamEnded)),
              )
          },
        },
      ),
    }))
    const ApplicationComposition = ApplicationDefinition.makeComposition()

    const prepare = () =>
      ApplicationComposition.prepareBlock({
        init: ApplicationComposition.makeInit(() => ({
          model: { isOpen: false, position: 0 },
        })),
        update: ApplicationComposition.makeUpdate({
          ClickedToggle: model => ({
            model: modifyFields(model, { isOpen: isOpen => !isOpen }),
          }),
          ClickedMove: model => ({
            model: modifyFields(model, { position: Number.increment }),
          }),
          EmittedPulse: model => ({ model }),
        }),
        view: ApplicationComposition.makeView((model, h) =>
          h.div(
            [],
            [
              h.button(
                [h.Id('toggle'), h.OnClick(Message.ClickedToggle())],
                [model.isOpen ? 'Open' : 'Closed'],
              ),
              h.button(
                [h.Id('move'), h.OnClick(Message.ClickedMove())],
                [`${model.position}`],
              ),
            ],
          ),
        ),
        subscriptions,
        EffectsLayer: subscriptions.layer,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    const handle = embed(
      Program.makeElement({ block: completedBlock, container }),
    )

    const readLatestPosition = () =>
      pipe(
        Array.last(readDependenciesCalls),
        Option.map(readDependencies => readDependencies().position),
      )

    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Closed0'))

      clickToggle()

      await vi.waitFor(() => expect(streamStarted).toHaveBeenCalledOnce())

      clickButton('move')
      clickButton('move')

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('Open2')
        expect(readLatestPosition()).toEqual(Option.some(2))
      })
      expect(streamStarted).toHaveBeenCalledOnce()
      expect(streamEnded).not.toHaveBeenCalled()

      clickToggle()

      await vi.waitFor(() => expect(streamEnded).toHaveBeenCalledOnce())

      clickButton('move')
      clickToggle()

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('Open3')
        expect(streamStarted).toHaveBeenCalledTimes(2)
        expect(readLatestPosition()).toEqual(Option.some(3))
      })
    } finally {
      handle.dispose()
    }
  })
})
