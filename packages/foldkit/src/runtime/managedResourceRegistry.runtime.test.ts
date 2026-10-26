import { Effect, Fiber, Option, Schema } from 'effect'
import { afterEach, expect, it, vi } from 'vitest'

import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import * as Program from './programPublic.js'
import { __startProgram } from './start.js'

const Model = Schema.Struct({ active: Schema.Boolean })
const Message = defineMessageUnion({
  AcquiredHiddenResource: {},
  ReleasedHiddenResource: {},
})

const Definition = Block.makeDefinition('RuntimeManagedResourceRegistry', {
  Model,
  Message,
})
const Composition = Definition.makeComposition()
const HiddenResource = Definition.makeResource<string>()('Hidden')

afterEach(() => {
  document.body.innerHTML = ''
})

it('discovers a normalized nonenumerable entry without treating the aggregate Layer as an entry', async () => {
  const events: Array<string> = []
  const resources = Definition.makeManagedResources(entry => {
    const hidden = entry('ManageHidden', Schema.Option(Schema.Null), {
      resource: HiddenResource,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: () => Message.AcquiredHiddenResource(),
      onReleased: () => Message.ReleasedHiddenResource(),
      onAcquireError: () => Message.ReleasedHiddenResource(),
      handler: function* () {
        return {
          acquire: () =>
            Effect.sync(() => {
              events.push('acquired')
              return 'value'
            }),
          release: () =>
            Effect.sync(() => {
              events.push('released')
            }),
        }
      },
    })
    const entries = { hidden }
    Object.defineProperty(entries, 'hidden', {
      enumerable: false,
      value: hidden,
    })
    return entries
  })
  const init = Composition.makeInit(() => ({
    model: Model.make({ active: true }),
  }))
  const update = Composition.makeUpdate({
    AcquiredHiddenResource: model => ({ model }),
    ReleasedHiddenResource: model => ({ model }),
  })
  const view = Composition.makeView((_model, h) => h.div([], ['ready']))
  const prepare = () =>
    Composition.prepareBlock({
      init,
      update,
      view,
      managedResources: resources,
      EffectsLayer: resources.layer,
    })
  const RuntimeBlock: Block.FromAssemblyWithView<
    typeof Composition.Model,
    typeof prepare
  > = Block.assemble(prepare)
  const container = document.createElement('div')
  container.id = 'managed-resource-registry-runtime'
  document.body.appendChild(container)
  const element = Program.makeElement({ block: RuntimeBlock, container })
  const fiber = Effect.runFork(__startProgram(element, undefined, 'Fresh'))

  expect(Object.keys(RuntimeBlock.managedResources)).toEqual(['hidden'])
  expect(Object.hasOwn(RuntimeBlock.managedResources, 'layer')).toBe(false)
  expect(Object.isFrozen(resources)).toBe(true)

  try {
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('ready')
      expect(events).toContain('acquired')
    })
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }

  expect(events).toEqual(['acquired', 'released'])
})
