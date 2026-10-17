import {
  Context,
  Deferred,
  Effect,
  Layer,
  Option,
  Schema,
  Stream,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { define } from '../block/define.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { define as defineApplication } from './applicationPublic.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import { embed, run } from './start.js'

class ValueSource extends Context.Service<
  ValueSource,
  Readonly<{ value: string }>
>()('ApplicationBlock/ValueSource') {}

const Child = define('RootChild')
const ChildModel = Schema.Struct({ label: Schema.String })
const ChildMessage = defineMessageUnion({
  CompletedReadValue: { value: Schema.String },
})
const ReadValue = Child.command('ReadValue', {
  messages: [ChildMessage.CompletedReadValue],
  handler: function* () {
    const source = yield* ValueSource

    return () =>
      Effect.succeed(ChildMessage.CompletedReadValue({ value: source.value }))
  },
})
const child = Child.define({ Model: ChildModel, Message: ChildMessage })
const childComposition = child.makeComposition()
const childBlock = childComposition.makeBlock({
  init: (label: string) => ({ model: { label }, commands: [ReadValue()] }),
  update: childComposition.makeUpdate((model, { value }) => ({
    model: modifyFields(model, { label: () => value }),
  })),
  view: childComposition.makeView((model, h) => h.span([], [model.label])),
  EffectsLayer: ReadValue.layer,
})

const Model = Schema.Struct({ left: ChildModel, right: ChildModel })
const Message = defineMessageUnion({
  GotLeftMessage: { message: ChildMessage },
  GotRightMessage: { message: ChildMessage },
})
const Application = defineApplication({ Model, Message })
const LeftBinding = Application.bindChild(childBlock, {
  placement: 'Left',
  field: 'left',
  parentMessage: Message.GotLeftMessage,
  init: { args: () => ['left'] },
})
const RightBinding = Application.bindChild(childBlock, {
  placement: 'Right',
  field: 'right',
  parentMessage: Message.GotRightMessage,
  init: { args: () => ['right'] },
})
const composition = Application.makeComposition({
  childBindings: [LeftBinding, RightBinding],
})
const init = composition.makeInit(() => ({ model: {} }))
const update = composition.makeUpdate()
const view = composition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(LeftBinding.embedView({ slotId: 'left', model: model.left })),
      h.block(RightBinding.embedView({ slotId: 'right', model: model.right })),
    ],
  ),
)

class HostDependency extends Context.Service<
  HostDependency,
  Readonly<{ value: string }>
>()('ApplicationBlock/HostDependency') {}

const HostChild = define('ApplicationHostChild')
const HostChildModel = Schema.Struct({ value: Schema.String })
const HostChildMessage = defineMessageUnion({
  CompletedReadHostValue: { value: Schema.String },
})
const ReadHostValue = HostChild.command('ReadHostValue', {
  messages: [HostChildMessage.CompletedReadHostValue],
})
const hostChild = HostChild.define({
  Model: HostChildModel,
  Message: HostChildMessage,
})
const hostChildComposition = hostChild.makeComposition()
const unresolvedHostChild = hostChildComposition.makeBlock({
  init: () => ({ model: { value: '' }, commands: [ReadHostValue()] }),
  update: hostChildComposition.makeUpdate((model, { value }) => ({
    model: modifyFields(model, { value: () => value }),
  })),
  view: hostChildComposition.makeView((model, h) => h.span([], [model.value])),
  EffectsLayer: Layer.empty,
  hostHandlers: [ReadHostValue],
})
const resolvedHostChild = unresolvedHostChild.provideHandlers(
  ReadHostValue.toLayer(
    Effect.gen(function* () {
      const dependency = yield* HostDependency
      return () =>
        Effect.succeed(
          HostChildMessage.CompletedReadHostValue({ value: dependency.value }),
        )
    }),
  ),
)

const HostParentModel = Schema.Struct({ child: HostChildModel })
const HostParentMessage = defineMessageUnion({
  GotChildMessage: { message: HostChildMessage },
})
const hostParent = defineApplication({
  Model: HostParentModel,
  Message: HostParentMessage,
})
const UnresolvedHostBinding = hostParent.bindChild(unresolvedHostChild, {
  read: (model: typeof HostParentModel.Type) => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, { child: () => nextChild }),
  parentMessage: HostParentMessage.GotChildMessage,
})
const ResolvedHostBinding = hostParent.bindChild(resolvedHostChild, {
  read: (model: typeof HostParentModel.Type) => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, { child: () => nextChild }),
  parentMessage: HostParentMessage.GotChildMessage,
})
const unresolvedHostComposition = hostParent.makeComposition({
  childBindings: [UnresolvedHostBinding],
})
const resolvedHostComposition = hostParent.makeComposition({
  childBindings: [ResolvedHostBinding],
})
const unresolvedHostInit = unresolvedHostComposition.makeInit(() =>
  UnresolvedHostBinding.init({ args: [], toParentModel: child => ({ child }) }),
)
const resolvedHostInit = resolvedHostComposition.makeInit(() =>
  ResolvedHostBinding.init({ args: [], toParentModel: child => ({ child }) }),
)
const unresolvedHostUpdate = unresolvedHostComposition.makeUpdate()
const resolvedHostUpdate = resolvedHostComposition.makeUpdate()
const unresolvedHostView = unresolvedHostComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        UnresolvedHostBinding.embedView({
          slotId: 'host-child',
          model: model.child,
        }),
      ),
    ],
  ),
)
const resolvedHostView = resolvedHostComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        ResolvedHostBinding.embedView({
          slotId: 'host-child',
          model: model.child,
        }),
      ),
    ],
  ),
)

beforeEach(() => {
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('registered Application composition completion', () => {
  it('includes child recipes and lifts initialization Commands through the real runtime', async () => {
    const container = document.createElement('div')
    container.id = 'composed-element'
    document.body.append(container)
    let acquisitions = 0
    let releases = 0
    const ServicesLayer = Layer.effect(
      ValueSource,
      Effect.acquireRelease(
        Effect.sync(() => {
          acquisitions += 1
          return { value: 'provided' }
        }),
        () =>
          Effect.sync(() => {
            releases += 1
          }),
      ),
    )
    const application = composition.makeElement({
      container,
      init,
      update,
      view,
      EffectsLayer: Layer.empty,
    })
    expect(init().model).toEqual({
      left: { label: 'left' },
      right: { label: 'right' },
    })
    const runnable = application.provide(ServicesLayer)
    const handle = embed(runnable)

    try {
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('providedprovided'),
      )
      expect(acquisitions).toBe(1)
    } finally {
      handle.dispose()
    }
    await vi.waitFor(() => expect(releases).toBe(1))
  })

  it('routes a leaf Command result through every composed Message wrapper with its leaf resource', async () => {
    let resourceAcquisitions = 0
    const Leaf = define('NestedCommandLeaf')
    const LeafValue = Leaf.resource<string>()('Value')
    const LeafModel = Schema.Struct({ value: Schema.String })
    const LeafMessage = defineMessageUnion({
      ClickedReadValue: {},
      CompletedReadValue: { value: Schema.String },
      FailedReadValue: {},
      AcquiredValue: {},
      ReleasedValue: {},
      FailedAcquireValue: {},
    })
    const ReadLeafValue = Leaf.command('ReadLeafValue', {
      messages: [LeafMessage.CompletedReadValue, LeafMessage.FailedReadValue],
      handler: function* () {
        return () =>
          LeafValue.get.pipe(
            Effect.map(value => LeafMessage.CompletedReadValue({ value })),
            Effect.catch(() => Effect.succeed(LeafMessage.FailedReadValue())),
          )
      },
    })
    const leaf = Leaf.define({ Model: LeafModel, Message: LeafMessage })
    const leafManagedResources = leaf.managedResources(entry => ({
      value: entry('Value', Schema.Option(Schema.Null), {
        resource: LeafValue,
        modelToMaybeRequirements: () => Option.some(null),
        onAcquired: () => LeafMessage.AcquiredValue(),
        onReleased: () => LeafMessage.ReleasedValue(),
        onAcquireError: () => LeafMessage.FailedAcquireValue(),
        handler: function* () {
          return {
            acquire: () =>
              Effect.sync(() => {
                resourceAcquisitions += 1
                return 'leaf resource value'
              }),
            release: () => Effect.void,
          }
        },
      }),
    }))
    const leafComposition = leaf.makeComposition()
    const leafBlock = leafComposition.makeBlock({
      init: () => ({ model: { value: 'pending' } }),
      update: leafComposition.makeUpdate((model, message) =>
        LeafMessage.match(message, {
          ClickedReadValue: () => ({ model, commands: [ReadLeafValue()] }),
          CompletedReadValue: ({ value }) => ({
            model: modifyFields(model, { value: () => value }),
          }),
          FailedReadValue: () => ({ model }),
          AcquiredValue: () => ({ model }),
          ReleasedValue: () => ({ model }),
          FailedAcquireValue: () => ({ model }),
        }),
      ),
      view: leafComposition.makeView((model, h) =>
        h.div(
          [],
          [
            h.button(
              [
                h.Id('read-nested-leaf'),
                h.OnClick(LeafMessage.ClickedReadValue()),
              ],
              ['Read leaf'],
            ),
            h.span([h.Id('nested-leaf-value')], [model.value]),
          ],
        ),
      ),
      managedResources: leafManagedResources,
      EffectsLayer: Layer.merge(
        ReadLeafValue.layer,
        leafManagedResources.value.layer,
      ),
    })

    const Middle = define('NestedCommandMiddle')
    const MiddleModel = Schema.Struct({ leaf: LeafModel })
    const MiddleMessage = defineMessageUnion({
      GotLeafMessage: { message: LeafMessage },
    })
    const middle = Middle.define({
      Model: MiddleModel,
      Message: MiddleMessage,
    })
    const LeafBinding = middle.bindChild(leafBlock, {
      read: model => Option.some(model.leaf),
      write: (model, nextLeaf) => modifyFields(model, { leaf: () => nextLeaf }),
      parentMessage: MiddleMessage.GotLeafMessage,
    })
    const middleComposition = middle.makeComposition({
      childBindings: [LeafBinding],
    })
    const middleBlock = middleComposition.makeBlock({
      init: middleComposition.makeInit(() =>
        LeafBinding.init({ args: [], toParentModel: leaf => ({ leaf }) }),
      ),
      update: middleComposition.makeUpdate(),
      view: middleComposition.makeView((model, h) =>
        h.block(
          LeafBinding.embedView({
            slotId: 'nested-leaf',
            model: model.leaf,
          }),
        ),
      ),
      EffectsLayer: Layer.empty,
    })

    const RootModel = Schema.Struct({ middle: MiddleModel })
    const RootMessage = defineMessageUnion({
      GotMiddleMessage: { message: MiddleMessage },
    })
    const root = defineApplication({
      Model: RootModel,
      Message: RootMessage,
    })
    const MiddleBinding = root.bindChild(middleBlock, {
      read: model => Option.some(model.middle),
      write: (model, nextMiddle) =>
        modifyFields(model, { middle: () => nextMiddle }),
      parentMessage: RootMessage.GotMiddleMessage,
    })
    const nestedComposition = root.makeComposition({
      childBindings: [MiddleBinding],
    })
    const nestedInit = nestedComposition.makeInit(() =>
      MiddleBinding.init({ args: [], toParentModel: middle => ({ middle }) }),
    )
    const nestedUpdate = nestedComposition.makeUpdate()
    const nestedView = nestedComposition.makeView((model, h) =>
      h.block(
        MiddleBinding.embedView({
          slotId: 'nested-middle',
          model: model.middle,
        }),
      ),
    )
    const container = document.createElement('div')
    container.id = 'nested-command-root'
    document.body.append(container)
    const handle = embed(
      nestedComposition.makeElement({
        container,
        init: nestedInit,
        update: nestedUpdate,
        view: nestedView,
        EffectsLayer: Layer.empty,
      }),
    )

    try {
      await vi.waitFor(() => expect(resourceAcquisitions).toBe(1))
      document.getElementById('read-nested-leaf')?.click()
      await vi.waitFor(() =>
        expect(document.getElementById('nested-leaf-value')?.textContent).toBe(
          'leaf resource value',
        ),
      )
    } finally {
      handle.dispose()
    }
  })

  it('keeps an application Service alive across optional child replacement', async () => {
    class SharedValue extends Context.Service<
      SharedValue,
      Readonly<{ value: string }>
    >()('ApplicationBlock/SharedValue') {}

    let serviceAcquisitions = 0
    let serviceReleases = 0
    const SharedValueLayer = Layer.effect(
      SharedValue,
      Effect.acquireRelease(
        Effect.sync(() => {
          serviceAcquisitions += 1
          return { value: `service-${serviceAcquisitions}` }
        }),
        () =>
          Effect.sync(() => {
            serviceReleases += 1
          }),
      ),
    )
    const ServiceChild = define('ServiceLifetimeChild')
    const ServiceChildModel = Schema.Struct({ value: Schema.String })
    const ServiceChildMessage = defineMessageUnion({
      CompletedReadSharedValue: { value: Schema.String },
    })
    const ReadSharedValue = ServiceChild.command('ReadSharedValue', {
      messages: [ServiceChildMessage.CompletedReadSharedValue],
      handler: function* () {
        const sharedValue = yield* SharedValue

        return () =>
          Effect.succeed(
            ServiceChildMessage.CompletedReadSharedValue({
              value: sharedValue.value,
            }),
          )
      },
    })
    const serviceChild = ServiceChild.define({
      Model: ServiceChildModel,
      Message: ServiceChildMessage,
    })
    const serviceChildComposition = serviceChild.makeComposition()
    const serviceChildBlock = serviceChildComposition.makeBlock({
      init: () => ({
        model: { value: 'pending' },
        commands: [ReadSharedValue()],
      }),
      update: serviceChildComposition.makeUpdate((model, { value }) => ({
        model: modifyFields(model, { value: () => value }),
      })),
      view: serviceChildComposition.makeView((model, h) =>
        h.span([h.Id('service-child-value')], [model.value]),
      ),
      EffectsLayer: ReadSharedValue.layer,
    })
    const ServiceRootModel = Schema.Struct({
      maybeChild: Schema.Option(ServiceChildModel),
    })
    const ServiceRootMessage = defineMessageUnion({
      GotServiceChildMessage: { message: ServiceChildMessage },
      ClickedRemoveServiceChild: {},
      ClickedAddServiceChild: {},
    })
    const serviceRoot = defineApplication({
      Model: ServiceRootModel,
      Message: ServiceRootMessage,
    })
    const ServiceChildBinding = serviceRoot.bindChild(serviceChildBlock, {
      read: model => model.maybeChild,
      write: (model, nextChild) =>
        modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
      parentMessage: ServiceRootMessage.GotServiceChildMessage,
    })
    const serviceComposition = serviceRoot.makeComposition({
      childBindings: [ServiceChildBinding],
    })
    const serviceInit = serviceComposition.makeInit(() =>
      ServiceChildBinding.init({
        args: [],
        toParentModel: child => ({ maybeChild: Option.some(child) }),
      }),
    )
    const serviceUpdate = serviceComposition.makeUpdate((model, message) =>
      ServiceRootMessage.match(message, {
        ClickedRemoveServiceChild: () => ({
          model: modifyFields(model, {
            maybeChild: () => Option.none(),
          }),
        }),
        ClickedAddServiceChild: () =>
          ServiceChildBinding.init({
            args: [],
            toParentModel: child =>
              modifyFields(model, {
                maybeChild: () => Option.some(child),
              }),
          }),
      }),
    )
    const serviceView = serviceComposition.makeView((model, h) =>
      h.div(
        [],
        [
          h.button(
            [
              h.Id('remove-service-child'),
              h.OnClick(ServiceRootMessage.ClickedRemoveServiceChild()),
            ],
            ['Remove'],
          ),
          h.button(
            [
              h.Id('add-service-child'),
              h.OnClick(ServiceRootMessage.ClickedAddServiceChild()),
            ],
            ['Add'],
          ),
          Option.match(model.maybeChild, {
            onNone: () => h.span([h.Id('service-child-absent')], ['absent']),
            onSome: childModel =>
              h.block(
                ServiceChildBinding.embedView({
                  slotId: 'service-child',
                  model: childModel,
                }),
              ),
          }),
        ],
      ),
    )
    const container = document.createElement('div')
    container.id = 'service-lifetime-root'
    document.body.append(container)
    const handle = embed(
      serviceComposition
        .makeElement({
          container,
          init: serviceInit,
          update: serviceUpdate,
          view: serviceView,
          EffectsLayer: Layer.empty,
        })
        .provide(SharedValueLayer),
    )

    try {
      await vi.waitFor(() =>
        expect(
          document.getElementById('service-child-value')?.textContent,
        ).toBe('service-1'),
      )
      expect(serviceAcquisitions).toBe(1)
      expect(serviceReleases).toBe(0)

      document.getElementById('remove-service-child')?.click()
      await vi.waitFor(() =>
        expect(document.getElementById('service-child-absent')).not.toBeNull(),
      )
      expect(serviceAcquisitions).toBe(1)
      expect(serviceReleases).toBe(0)

      document.getElementById('add-service-child')?.click()
      await vi.waitFor(() =>
        expect(
          document.getElementById('service-child-value')?.textContent,
        ).toBe('service-1'),
      )
      expect(serviceAcquisitions).toBe(1)
      expect(serviceReleases).toBe(0)
    } finally {
      handle.dispose()
    }

    await vi.waitFor(() => expect(serviceReleases).toBe(1))
  })

  it('gives repeated child Mounts their current resource slots', async () => {
    const Feature = define('MountedResource')
    const ready = Deferred.makeUnsafe<void>()
    let acquisitions = 0
    const Value = Feature.resource<string>()('Value')
    const FeatureModel = Schema.Struct({ label: Schema.String })
    const FeatureMessage = defineMessageUnion({
      AcquiredValue: {},
      ReleasedValue: {},
      FailedAcquireValue: {},
      CompletedObserveValue: { value: Schema.String },
      FailedObserveValue: {},
    })
    const ObserveValue = Feature.mountStream('ObserveValue', {
      messages: [
        FeatureMessage.CompletedObserveValue,
        FeatureMessage.FailedObserveValue,
      ],
      handler: function* () {
        return () =>
          Stream.fromEffect(
            Deferred.await(ready).pipe(
              Effect.andThen(Value.get),
              Effect.map(value =>
                FeatureMessage.CompletedObserveValue({ value }),
              ),
              Effect.catch(() =>
                Effect.succeed(FeatureMessage.FailedObserveValue()),
              ),
            ),
          )
      },
    })
    const feature = Feature.define({
      Model: FeatureModel,
      Message: FeatureMessage,
    })
    const featureComposition = feature.makeComposition({
      mounts: [ObserveValue],
    })
    const managedResources = feature.managedResources(entry => ({
      value: entry(
        'Value',
        Schema.Option(Schema.Struct({ label: Schema.String })),
        {
          resource: Value,
          modelToMaybeRequirements: model =>
            Option.some({ label: model.label }),
          onAcquired: () => FeatureMessage.AcquiredValue(),
          onReleased: () => FeatureMessage.ReleasedValue(),
          onAcquireError: () => FeatureMessage.FailedAcquireValue(),
          handler: function* () {
            return {
              acquire: ({ label }) => Effect.succeed(label),
              release: () => Effect.void,
            }
          },
        },
      ),
    }))
    const featureBlock = featureComposition.makeBlock({
      init: (label: string) => ({ model: { label } }),
      update: featureComposition.makeUpdate(model => ({ model })),
      view: featureComposition.makeView((model, h) =>
        h.div([h.OnMount(ObserveValue())], [model.label]),
      ),
      managedResources,
      EffectsLayer: Layer.merge(
        ObserveValue.layer,
        managedResources.value.layer,
      ),
    })
    const RootModel = Schema.Struct({ left: FeatureModel, right: FeatureModel })
    const RootMessage = defineMessageUnion({
      GotLeft: { message: FeatureMessage },
      GotRight: { message: FeatureMessage },
    })
    const root = defineApplication({
      Model: RootModel,
      Message: RootMessage,
    })
    const LeftBinding = root.bindChild(featureBlock, {
      fromParentMessage: false,
      placement: 'Left',
      read: (model: typeof RootModel.Type) => Option.some(model.left),
      write: (model, nextLeft) => modifyFields(model, { left: () => nextLeft }),
      toParentMessage: message => RootMessage.GotLeft({ message }),
    })
    const RightBinding = root.bindChild(featureBlock, {
      fromParentMessage: false,
      placement: 'Right',
      read: (model: typeof RootModel.Type) => Option.some(model.right),
      write: (model, nextRight) =>
        modifyFields(model, { right: () => nextRight }),
      toParentMessage: message => RootMessage.GotRight({ message }),
    })
    const rootComposition = root.makeComposition({
      childBindings: [LeftBinding, RightBinding],
    })
    const seen: Array<string> = []
    const rootInit = () => ({
      model: {
        left: featureBlock.init('left').model,
        right: featureBlock.init('right').model,
      },
    })
    const rootUpdate = rootComposition.makeUpdate((model, message) => {
      if (message.message._tag === 'AcquiredValue') {
        acquisitions += 1
        if (acquisitions === 2) {
          Deferred.doneUnsafe(ready, Effect.void)
        }
      }
      if (message.message._tag === 'CompletedObserveValue') {
        seen.push(`${message._tag}:${message.message.value}`)
      }
      return { model }
    })
    const rootView = rootComposition.makeView((model, h) =>
      h.div(
        [],
        [
          h.block(LeftBinding.embedView({ slotId: 'left', model: model.left })),
          h.block(
            RightBinding.embedView({ slotId: 'right', model: model.right }),
          ),
        ],
      ),
    )
    const container = document.createElement('div')
    container.id = 'mounted-root'
    document.body.append(container)
    const handle = embed(
      rootComposition.makeElement({
        container,
        init: rootInit,
        update: rootUpdate,
        view: rootView,
        EffectsLayer: Layer.empty,
      }),
    )

    try {
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('leftright'),
      )
      await vi.waitFor(() => expect(seen).toContain('GotLeft:left'))
      await vi.waitFor(() => expect(seen).toContain('GotRight:right'))
    } finally {
      handle.dispose()
    }
  })
})

const checkAssemblyTypes = (container: HTMLElement) => {
  const application = composition.makeElement({
    container,
    init,
    update,
    view,
    EffectsLayer: Layer.empty,
  })
  // @ts-expect-error Shared Service requirements must be provided before running.
  run(application)
  // @ts-expect-error ApplicationComposition.makeApplication requires a Document view.
  composition.makeApplication({
    container,
    init,
    update,
    view,
    EffectsLayer: Layer.empty,
  })

  // @ts-expect-error Root completion requires inherited host handlers to be supplied first.
  unresolvedHostComposition.makeElement({
    container,
    init: unresolvedHostInit,
    update: unresolvedHostUpdate,
    view: unresolvedHostView,
    EffectsLayer: Layer.empty,
  })
  const hostApplication = resolvedHostComposition.makeElement({
    container,
    init: resolvedHostInit,
    update: resolvedHostUpdate,
    view: resolvedHostView,
    EffectsLayer: Layer.empty,
  })
  hostApplication.provide(Layer.succeed(HostDependency, { value: 'provided' }))
}
void checkAssemblyTypes
