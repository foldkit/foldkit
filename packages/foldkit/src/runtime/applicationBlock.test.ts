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

import { makeNamespace } from '../block/define.js'
import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import * as Program from './programPublic.js'
import { embed, run } from './start.js'

class ValueSource extends Context.Service<
  ValueSource,
  Readonly<{ value: string }>
>()('ApplicationBlock/ValueSource') {}

const ChildOwnerNamespace = makeNamespace('RootChild')
const ChildModel = Schema.Struct({ label: Schema.String })
const ChildMessage = defineMessageUnion({
  CompletedReadValue: { value: Schema.String },
})
const ReadValue = ChildOwnerNamespace.makeCommand('ReadValue', {
  messages: [ChildMessage.CompletedReadValue],
  handler: function* () {
    const source = yield* ValueSource

    return () =>
      Effect.succeed(ChildMessage.CompletedReadValue({ value: source.value }))
  },
})

const childComposition = ChildOwnerNamespace.makeDefinition({
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChildBlock = () =>
  childComposition.prepareBlock({
    init: (label: string) => ({ model: { label }, commands: [ReadValue()] }),
    update: childComposition.makeUpdate({
      CompletedReadValue: (model, { value }) => ({
        model: modifyFields(model, { label: () => value }),
      }),
    }),
    view: childComposition.makeView((model, h) => h.span([], [model.label])),
    EffectsLayer: ReadValue.layer,
  })
const childBlock: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const Model = Schema.Struct({ left: ChildModel, right: ChildModel })
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message: Schema.Never,
})
const LeftBinding = ApplicationDefinition.makeBinding(childBlock, {
  placement: 'Left',
  field: 'left',
  init: { contextToArgs: () => ['left'] },
})
const RightBinding = ApplicationDefinition.makeBinding(childBlock, {
  placement: 'Right',
  field: 'right',
  init: { contextToArgs: () => ['right'] },
})
const composition = ApplicationDefinition.makeComposition({
  bindings: [LeftBinding, RightBinding],
})
const init = composition.makeInit(() => ({ model: {} }))
const update = composition.makeUpdate({})
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

const HostChildOwnerNamespace = makeNamespace('ApplicationHostChild')
const HostChildModel = Schema.Struct({ value: Schema.String })
const HostChildMessage = defineMessageUnion({
  CompletedReadHostValue: { value: Schema.String },
})
const ReadHostValue = HostChildOwnerNamespace.makeCommand('ReadHostValue', {
  messages: [HostChildMessage.CompletedReadHostValue],
})

const hostChildComposition = HostChildOwnerNamespace.makeDefinition({
  Model: HostChildModel,
  Message: HostChildMessage,
}).makeComposition()
const prepareUnresolvedHostChild = () =>
  hostChildComposition.prepareBlock({
    init: () => ({ model: { value: '' }, commands: [ReadHostValue()] }),
    update: hostChildComposition.makeUpdate({
      CompletedReadHostValue: (model, { value }) => ({
        model: modifyFields(model, { value: () => value }),
      }),
    }),
    view: hostChildComposition.makeView((model, h) =>
      h.span([], [model.value]),
    ),
    EffectsLayer: Layer.empty,
    hostHandlers: [ReadHostValue],
  })
const unresolvedHostChild: Block.FromAssemblyWithView<
  typeof HostChildModel,
  typeof prepareUnresolvedHostChild
> = Block.assemble(prepareUnresolvedHostChild)
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
const HostParentDefinition = Block.makeDefinition('Application', {
  Model: HostParentModel,
  Message: Schema.Never,
})
const UnresolvedHostBinding = HostParentDefinition.makeBinding(
  unresolvedHostChild,
  {
    read: (model: typeof HostParentModel.Type) => Option.some(model.child),
    write: (model, nextChild) =>
      modifyFields(model, { child: () => nextChild }),
  },
)
const ResolvedHostBinding = HostParentDefinition.makeBinding(
  resolvedHostChild,
  {
    read: (model: typeof HostParentModel.Type) => Option.some(model.child),
    write: (model, nextChild) =>
      modifyFields(model, { child: () => nextChild }),
  },
)
const unresolvedHostComposition = HostParentDefinition.makeComposition({
  bindings: [UnresolvedHostBinding],
})
const resolvedHostComposition = HostParentDefinition.makeComposition({
  bindings: [ResolvedHostBinding],
})
const unresolvedHostInit = unresolvedHostComposition.makeInit(() =>
  UnresolvedHostBinding.init({ args: [], toParentModel: child => ({ child }) }),
)
const resolvedHostInit = resolvedHostComposition.makeInit(() =>
  ResolvedHostBinding.init({ args: [], toParentModel: child => ({ child }) }),
)
const unresolvedHostUpdate = unresolvedHostComposition.makeUpdate({})
const resolvedHostUpdate = resolvedHostComposition.makeUpdate({})
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

describe('completed root Block hosting', () => {
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

    const prepare = () =>
      composition.prepareBlock({
        init,
        update,
        view,
        EffectsLayer: Layer.empty,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    const application = Program.makeElement({
      block: completedBlock,
      container,
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
    const LeafOwnerNamespace = makeNamespace('NestedCommandLeaf')
    const LeafValue = LeafOwnerNamespace.makeResource<string>()('Value')
    const LeafModel = Schema.Struct({ value: Schema.String })
    const LeafMessage = defineMessageUnion({
      ClickedReadValue: {},
      CompletedReadValue: { value: Schema.String },
      FailedReadValue: {},
      AcquiredValue: {},
      ReleasedValue: {},
      FailedAcquireValue: {},
    })
    const ReadLeafValue = LeafOwnerNamespace.makeCommand('ReadLeafValue', {
      messages: [LeafMessage.CompletedReadValue, LeafMessage.FailedReadValue],
      handler: function* () {
        return () =>
          LeafValue.get.pipe(
            Effect.map(value => LeafMessage.CompletedReadValue({ value })),
            Effect.catch(() => Effect.succeed(LeafMessage.FailedReadValue())),
          )
      },
    })
    const LeafDefinition = LeafOwnerNamespace.makeDefinition({
      Model: LeafModel,
      Message: LeafMessage,
    })
    const leafManagedResources = LeafDefinition.makeManagedResources(entry => ({
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
    const leafComposition = LeafDefinition.makeComposition()
    const prepareLeafBlock = () =>
      leafComposition.prepareBlock({
        init: () => ({ model: { value: 'pending' } }),
        update: leafComposition.makeUpdate({
          ClickedReadValue: model => ({ model, commands: [ReadLeafValue()] }),
          CompletedReadValue: (model, { value }) => ({
            model: modifyFields(model, { value: () => value }),
          }),
          FailedReadValue: model => ({ model }),
          AcquiredValue: model => ({ model }),
          ReleasedValue: model => ({ model }),
          FailedAcquireValue: model => ({ model }),
        }),
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
    const leafBlock: Block.FromAssemblyWithView<
      typeof LeafModel,
      typeof prepareLeafBlock
    > = Block.assemble(prepareLeafBlock)

    const MiddleOwnerNamespace = makeNamespace('NestedCommandMiddle')
    const MiddleModel = Schema.Struct({ leaf: LeafModel })
    const MiddleDefinition = MiddleOwnerNamespace.makeDefinition({
      Model: MiddleModel,
      Message: Schema.Never,
    })
    const LeafBinding = MiddleDefinition.makeBinding(leafBlock, {
      read: model => Option.some(model.leaf),
      write: (model, nextLeaf) => modifyFields(model, { leaf: () => nextLeaf }),
    })
    const middleComposition = MiddleDefinition.makeComposition({
      bindings: [LeafBinding],
    })
    const prepareMiddleBlock = () =>
      middleComposition.prepareBlock({
        init: middleComposition.makeInit(() =>
          LeafBinding.init({ args: [], toParentModel: leaf => ({ leaf }) }),
        ),
        update: middleComposition.makeUpdate({}),
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
    const middleBlock: Block.FromAssemblyWithView<
      typeof MiddleModel,
      typeof prepareMiddleBlock
    > = Block.assemble(prepareMiddleBlock)

    const RootModel = Schema.Struct({ middle: MiddleModel })
    const RootDefinition = Block.makeDefinition('Application', {
      Model: RootModel,
      Message: Schema.Never,
    })
    const MiddleBinding = RootDefinition.makeBinding(middleBlock, {
      read: model => Option.some(model.middle),
      write: (model, nextMiddle) =>
        modifyFields(model, { middle: () => nextMiddle }),
    })
    const nestedComposition = RootDefinition.makeComposition({
      bindings: [MiddleBinding],
    })
    const nestedInit = nestedComposition.makeInit(() =>
      MiddleBinding.init({ args: [], toParentModel: middle => ({ middle }) }),
    )
    const nestedUpdate = nestedComposition.makeUpdate({})
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

    const prepare = () =>
      nestedComposition.prepareBlock({
        init: nestedInit,
        update: nestedUpdate,
        view: nestedView,
        EffectsLayer: Layer.empty,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof RootModel,
      typeof prepare
    > = Block.assemble(prepare)
    const handle = embed(
      Program.makeElement({
        block: completedBlock,
        container,
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
    const ServiceChildOwnerNamespace = makeNamespace('ServiceLifetimeChild')
    const ServiceChildModel = Schema.Struct({ value: Schema.String })
    const ServiceChildMessage = defineMessageUnion({
      CompletedReadSharedValue: { value: Schema.String },
    })
    const ReadSharedValue = ServiceChildOwnerNamespace.makeCommand(
      'ReadSharedValue',
      {
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
      },
    )

    const serviceChildComposition = ServiceChildOwnerNamespace.makeDefinition({
      Model: ServiceChildModel,
      Message: ServiceChildMessage,
    }).makeComposition()
    const prepareServiceChildBlock = () =>
      serviceChildComposition.prepareBlock({
        init: () => ({
          model: { value: 'pending' },
          commands: [ReadSharedValue()],
        }),
        update: serviceChildComposition.makeUpdate({
          CompletedReadSharedValue: (model, { value }) => ({
            model: modifyFields(model, { value: () => value }),
          }),
        }),
        view: serviceChildComposition.makeView((model, h) =>
          h.span([h.Id('service-child-value')], [model.value]),
        ),
        EffectsLayer: ReadSharedValue.layer,
      })
    const serviceChildBlock: Block.FromAssemblyWithView<
      typeof ServiceChildModel,
      typeof prepareServiceChildBlock
    > = Block.assemble(prepareServiceChildBlock)
    const ServiceRootModel = Schema.Struct({
      maybeChild: Schema.Option(ServiceChildModel),
    })
    const ServiceRootMessage = defineMessageUnion({
      ClickedRemoveServiceChild: {},
      ClickedAddServiceChild: {},
    })
    const ServiceRootDefinition = Block.makeDefinition('Application', {
      Model: ServiceRootModel,
      Message: ServiceRootMessage,
    })
    const ServiceChildBinding = ServiceRootDefinition.makeBinding(
      serviceChildBlock,
      {
        read: model => model.maybeChild,
        write: (model, nextChild) =>
          modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
      },
    )
    const serviceComposition = ServiceRootDefinition.makeComposition({
      bindings: [ServiceChildBinding],
    })
    const serviceInit = serviceComposition.makeInit(() =>
      ServiceChildBinding.init({
        args: [],
        toParentModel: child => ({ maybeChild: Option.some(child) }),
      }),
    )
    const serviceUpdate = serviceComposition.makeUpdate({
      ClickedRemoveServiceChild: model =>
        ServiceRootDefinition.makeFieldsStep(() => ({
          maybeChild: () => Option.none(),
        }))(model),
      ClickedAddServiceChild: model =>
        ServiceChildBinding.init({
          args: [],
          toParentModel: child =>
            modifyFields(model, {
              maybeChild: () => Option.some(child),
            }),
        }),
    })
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

    const prepare = () =>
      serviceComposition.prepareBlock({
        init: serviceInit,
        update: serviceUpdate,
        view: serviceView,
        EffectsLayer: Layer.empty,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof ServiceRootModel,
      typeof prepare
    > = Block.assemble(prepare)
    const handle = embed(
      Program.makeElement({
        block: completedBlock,
        container,
      }).provide(SharedValueLayer),
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
    const FeatureOwnerNamespace = makeNamespace('MountedResource')
    const ready = Deferred.makeUnsafe<void>()
    let acquisitions = 0
    const Value = FeatureOwnerNamespace.makeResource<string>()('Value')
    const FeatureModel = Schema.Struct({ label: Schema.String })
    const FeatureMessage = defineMessageUnion({
      AcquiredValue: {},
      ReleasedValue: {},
      FailedAcquireValue: {},
      CompletedObserveValue: { value: Schema.String },
      FailedObserveValue: {},
    })
    const FeatureOutMessage = defineMessageUnion({
      AcquiredValue: {},
      ObservedValue: { value: Schema.String },
    })
    const ObserveValue = FeatureOwnerNamespace.makeMountStream('ObserveValue', {
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
    const FeatureDefinition = FeatureOwnerNamespace.makeDefinition({
      Model: FeatureModel,
      Message: FeatureMessage,
      OutMessage: FeatureOutMessage,
    })
    const featureComposition = FeatureDefinition.makeComposition({
      mounts: [ObserveValue],
    })
    const managedResources = FeatureDefinition.makeManagedResources(entry => ({
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
    const prepareFeatureBlock = () =>
      featureComposition.prepareBlock({
        init: (label: string) => ({ model: { label } }),
        update: featureComposition.makeUpdate({
          AcquiredValue: model => ({
            model,
            outMessage: FeatureOutMessage.AcquiredValue(),
          }),
          ReleasedValue: model => ({ model }),
          FailedAcquireValue: model => ({ model }),
          CompletedObserveValue: (model, { value }) => ({
            model,
            outMessage: FeatureOutMessage.ObservedValue({ value }),
          }),
          FailedObserveValue: model => ({ model }),
        }),
        view: featureComposition.makeView((model, h) =>
          h.div([h.OnMount(ObserveValue())], [model.label]),
        ),
        managedResources,
        EffectsLayer: Layer.merge(
          ObserveValue.layer,
          managedResources.value.layer,
        ),
      })
    const featureBlock: Block.FromAssemblyWithViewAndOutMessage<
      typeof FeatureModel,
      typeof prepareFeatureBlock
    > = Block.assemble(prepareFeatureBlock)
    const RootModel = Schema.Struct({ left: FeatureModel, right: FeatureModel })
    const RootDefinition = Block.makeDefinition('Application', {
      Model: RootModel,
      Message: Schema.Never,
    })
    const seen: Array<string> = []
    const foldFeatureOutMessage = (source: 'GotLeft' | 'GotRight') =>
      FeatureOutMessage.match<Update.Step<typeof RootModel.Type, never>>({
        AcquiredValue: () => model => {
          acquisitions += 1
          if (acquisitions === 2) {
            Deferred.doneUnsafe(ready, Effect.void)
          }

          return { model }
        },
        ObservedValue:
          ({ value }) =>
          model => {
            seen.push(`${source}:${value}`)
            return { model }
          },
      })
    const LeftBinding = RootDefinition.makeBinding(featureBlock, {
      placement: 'Left',
      read: (model: typeof RootModel.Type) => Option.some(model.left),
      write: (model, nextLeft) => modifyFields(model, { left: () => nextLeft }),
    }).withOutMessagePolicy({ fold: foldFeatureOutMessage('GotLeft') })
    const RightBinding = RootDefinition.makeBinding(featureBlock, {
      placement: 'Right',
      read: (model: typeof RootModel.Type) => Option.some(model.right),
      write: (model, nextRight) =>
        modifyFields(model, { right: () => nextRight }),
    }).withOutMessagePolicy({ fold: foldFeatureOutMessage('GotRight') })
    const rootComposition = RootDefinition.makeComposition({
      bindings: [LeftBinding, RightBinding],
    })
    const rootInit = () => ({
      model: {
        left: featureBlock.init('left').model,
        right: featureBlock.init('right').model,
      },
    })
    const rootUpdate = rootComposition.makeUpdate({})
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

    const prepare = () =>
      rootComposition.prepareBlock({
        init: rootInit,
        update: rootUpdate,
        view: rootView,
        EffectsLayer: Layer.empty,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof RootModel,
      typeof prepare
    > = Block.assemble(prepare)
    const handle = embed(
      Program.makeElement({
        block: completedBlock,
        container,
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
  const prepareBlock = () =>
    composition.prepareBlock({
      init,
      update,
      view,
      EffectsLayer: Layer.empty,
    })
  const block: Block.FromAssemblyWithView<typeof Model, typeof prepareBlock> =
    Block.assemble(prepareBlock)
  const application = Program.makeElement({
    block,
    container,
  })
  // @ts-expect-error Shared Service requirements must be provided before running.
  run(application)
  // @ts-expect-error Program.make requires a Document view.
  Program.make({
    block,
    container,
  })
  const prepare = () =>
    unresolvedHostComposition.prepareBlock({
      init: unresolvedHostInit,
      update: unresolvedHostUpdate,
      view: unresolvedHostView,
      EffectsLayer: Layer.empty,
    })
  const completedBlock: Block.FromAssemblyWithView<
    typeof HostParentModel,
    typeof prepare
  > = Block.assemble(prepare)

  // @ts-expect-error Root completion requires inherited host handlers to be supplied first.
  Program.makeElement({
    block: completedBlock,
    container,
  })

  const prepare2 = () =>
    resolvedHostComposition.prepareBlock({
      init: resolvedHostInit,
      update: resolvedHostUpdate,
      view: resolvedHostView,
      EffectsLayer: Layer.empty,
    })
  const completedBlock2: Block.FromAssemblyWithView<
    typeof HostParentModel,
    typeof prepare2
  > = Block.assemble(prepare2)
  const hostApplication = Program.makeElement({
    block: completedBlock2,
    container,
  })
  hostApplication.provide(Layer.succeed(HostDependency, { value: 'provided' }))
}
void checkAssemblyTypes
