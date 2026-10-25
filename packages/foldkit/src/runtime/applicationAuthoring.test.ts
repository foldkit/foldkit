import { Context, Effect, Layer, Option, Schema } from 'effect'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest'

import { makeNamespace } from '../block/define.js'
import * as Block from '../block/public.js'
import type * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import type { Url } from '../url/index.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import { resolveProgramDevToolsConfig } from './program.js'
import * as Program from './programPublic.js'
import { embed } from './start.js'

class ValueSource extends Context.Service<
  ValueSource,
  Readonly<{ value: string }>
>()('ApplicationAuthoring/ValueSource') {}

const ChildOwnerNamespace = makeNamespace('ApplicationAuthoringChild')
const ChildModel = Schema.Struct({ value: Schema.String })
const ChildMessage = defineMessageUnion({
  UpdatedChildValue: { value: Schema.String },
})

const ChildComposition = ChildOwnerNamespace.makeDefinition({
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: { value: 'child' } }),
    update: ChildComposition.makeUpdate({
      UpdatedChildValue: (model, { value }) => ({
        model: modifyFields(model, { value: () => value }),
      }),
    }),
    view: ChildComposition.makeView((model, h) => h.span([], [model.value])),
  })
const childBlock: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const Model = Schema.Struct({
  rootValue: Schema.String,
  child: ChildModel,
})
const Message = defineMessageUnion({
  ClickedReadRootValue: {},
  CompletedReadRootValue: { value: Schema.String },
})
const ForeignMessage = defineMessageUnion({ ForeignCompleted: {} })
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ChildBinding = ApplicationDefinition.makeBinding(childBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, { child: () => nextChild }),
})
const graphlessComposition = ApplicationDefinition.makeComposition({
  bindings: [ChildBinding],
})
const ReadRootValue = ApplicationDefinition.makeCommand('ReadRootValue', {
  messages: [Message.CompletedReadRootValue],
  handler: function* () {
    const source = yield* ValueSource

    return () =>
      Effect.succeed(Message.CompletedReadRootValue({ value: source.value }))
  },
})
const documentView = graphlessComposition.makeView((model, h) => ({
  title: model.rootValue,
  body: h.div([], [model.rootValue]),
}))
const graphlessElementView = graphlessComposition.makeView((model, h) =>
  h.div([], [model.rootValue]),
)
const ObserveRoot = ApplicationDefinition.makeMount('ObserveRoot', {
  messages: [Message.CompletedReadRootValue],
  handler: function* () {
    return () =>
      Effect.succeed(Message.CompletedReadRootValue({ value: 'mounted' }))
  },
})
const mountedComposition = ApplicationDefinition.makeComposition({
  mounts: [ObserveRoot],
  bindings: [ChildBinding],
})
const mountedView = mountedComposition.makeView((model, h) =>
  h.div([h.OnMount(ObserveRoot())], [model.rootValue]),
)
const composition = ApplicationDefinition.makeComposition({
  bindings: [ChildBinding],
})
const initSource = () =>
  ChildBinding.init({
    args: [],
    toParentModel: child => ({ rootValue: 'pending', child }),
  })
const init = composition.makeInit(initSource)
const update = composition.makeUpdate({
  ClickedReadRootValue: model => ({
    model,
    commands: [ReadRootValue()],
  }),
  CompletedReadRootValue: (model, { value }) => ({
    model: modifyFields(model, { rootValue: () => value }),
  }),
})
expectTypeOf<Update.RequirementsOf<typeof update>>().toEqualTypeOf<
  Command.HandlerOf<typeof ReadRootValue>
>()
const rootBody = (
  model: typeof Model.Type,
  h: Block.ViewBuilderFor<typeof composition>,
) =>
  h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedReadRootValue())], [model.rootValue]),
      h.block(
        ChildBinding.embedView({
          slotId: 'child',
          model: model.child,
        }),
      ),
    ],
  )
const view = composition.makeView(rootBody)

const NoMessageModel = Schema.Null

const NoMessageComposition = Block.makeDefinition('Application', {
  Model: NoMessageModel,
  Message: Schema.Never,
}).makeComposition()
const noMessageInit = () => ({ model: null })
const noMessageUpdate = NoMessageComposition.makeUpdate({})
const noMessageDocumentView = NoMessageComposition.makeView((_model, h) => ({
  title: 'No messages',
  body: h.empty,
}))
const noMessageElementView = NoMessageComposition.makeView(
  (_model, h) => h.empty,
)

const typecheckRootCompletion = (): void => {
  // @ts-expect-error Inline views still require Composition.makeView ownership.
  NoMessageComposition.prepareBlock({
    init: noMessageInit,
    update: noMessageUpdate,
    view: () => ({ title: 'Unowned Document', body: null }),
    EffectsLayer: Layer.empty,
  })

  // @ts-expect-error Inline views still require Composition.makeView ownership.
  NoMessageComposition.prepareBlock({
    init: noMessageInit,
    update: noMessageUpdate,
    view: () => null,
    EffectsLayer: Layer.empty,
  })

  // @ts-expect-error An Application Definition does not author the primary view.
  ApplicationDefinition.makeView
  // @ts-expect-error An Application Definition does not expose the Composition-owned init helper.
  ApplicationDefinition.makeInit

  ApplicationDefinition.makeCommand('AcceptedCommand', {
    messages: [Message.CompletedReadRootValue],
  })
  ApplicationDefinition.makeMount('AcceptedMount', {
    messages: [Message.CompletedReadRootValue],
  })
  ApplicationDefinition.makeMountStream('AcceptedMountStream', {
    messages: [Message.CompletedReadRootValue],
  })

  ApplicationDefinition.makeCommand('ForeignCommand', {
    // @ts-expect-error Root Commands must produce the Application Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  ApplicationDefinition.makeMount('ForeignMount', {
    // @ts-expect-error Root Mounts must produce the Application Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  ApplicationDefinition.makeMountStream('ForeignMountStream', {
    // @ts-expect-error Root stream Mounts must produce the Application Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  // @ts-expect-error Primitive authoring remains on the Application Definition.
  composition.makeCommand

  composition.makeUpdate({
    ClickedReadRootValue: model => ({ model }),
    CompletedReadRootValue: model => ({ model }),
  })

  const prepareElementBlock = () =>
    composition.prepareBlock({
      init,
      update,
      view: graphlessElementView,
      EffectsLayer: ReadRootValue.layer,
    })
  const elementBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof prepareElementBlock
  > = Block.assemble(prepareElementBlock)
  Program.makeElement({ block: elementBlock, container: null })

  const prepareDocumentBlock = () =>
    composition.prepareBlock({
      init,
      update,
      view: documentView,
      EffectsLayer: ReadRootValue.layer,
    })
  const documentBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof prepareDocumentBlock
  > = Block.assemble(prepareDocumentBlock)
  const application = Program.make({ block: documentBlock, container: null })
  const pendingApplication: Program.Program<
    undefined,
    void,
    ValueSource,
    never,
    Layer.Success<typeof ReadRootValue.layer>
  > = application
  void pendingApplication

  const prepareNoMessageDocumentBlock = () =>
    NoMessageComposition.prepareBlock({
      init: noMessageInit,
      update: noMessageUpdate,
      view: noMessageDocumentView,
    })
  const noMessageDocumentBlock: Block.FromAssemblyWithView<
    typeof NoMessageModel,
    typeof prepareNoMessageDocumentBlock
  > = Block.assemble(prepareNoMessageDocumentBlock)
  Program.make({ block: noMessageDocumentBlock, container: null })
  const prepareNoMessageElementBlock = () =>
    NoMessageComposition.prepareBlock({
      init: noMessageInit,
      update: noMessageUpdate,
      view: noMessageElementView,
    })
  const noMessageElementBlock: Block.FromAssemblyWithView<
    typeof NoMessageModel,
    typeof prepareNoMessageElementBlock
  > = Block.assemble(prepareNoMessageElementBlock)
  Program.makeElement({ block: noMessageElementBlock, container: null })

  // @ts-expect-error Program.make requires a Document view.
  Program.make({
    block: elementBlock,
    container: null,
  })

  // @ts-expect-error Program.makeElement requires an Html view.
  Program.makeElement({
    block: documentBlock,
    container: null,
  })

  const unregisteredComposition = ApplicationDefinition.makeComposition()
  const unregisteredInit = () => ({
    model: { rootValue: 'pending', child: { value: 'child' } },
  })
  const unregisteredUpdate = unregisteredComposition.makeUpdate({
    ClickedReadRootValue: model => ({ model }),
    CompletedReadRootValue: model => ({ model }),
  })

  // @ts-expect-error The Composition has not registered the child used by this view.
  unregisteredComposition.prepareBlock({
    init: unregisteredInit,
    update: unregisteredUpdate,
    view,
    EffectsLayer: ReadRootValue.layer,
  })

  // @ts-expect-error The Composition has not registered the Mount used by this view.
  unregisteredComposition.prepareBlock({
    init: unregisteredInit,
    update: unregisteredUpdate,
    view: mountedView,
    EffectsLayer: Layer.merge(ReadRootValue.layer, ObserveRoot.layer),
  })

  // @ts-expect-error Root handler definitions must be included in EffectsLayer.
  composition.prepareBlock({
    init,
    update,
    view,
  })

  // @ts-expect-error Model is established by Block.makeDefinition.
  Program.makeElement({
    block: elementBlock,
    Model,
    container: null,
  })

  const Flags = Schema.Struct({ initialValue: Schema.String })
  const initWithFlags = (flags: typeof Flags.Type) => ({
    model: {
      rootValue: flags.initialValue,
      child: { value: 'child' },
    },
  })
  const prepareFlagsBlock = () =>
    composition.prepareBlock({
      init: initWithFlags,
      update,
      view,
      EffectsLayer: ReadRootValue.layer,
    })
  const flagsBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof prepareFlagsBlock
  > = Block.assemble(prepareFlagsBlock)
  const elementWithFlags = Program.makeElement({
    block: flagsBlock,
    Flags,
    flags: Effect.succeed({ initialValue: 'from flags' }),
    container: null,
  })
  const pendingElementWithFlags: Program.Element<
    undefined,
    ValueSource,
    never,
    Layer.Success<typeof ReadRootValue.layer>
  > = elementWithFlags
  void pendingElementWithFlags

  const routedImplementation = {
    init: (_url: Url) => init(),
    update,
    view: documentView,
    EffectsLayer: ReadRootValue.layer,
  }
  const prepareRoutedBlock = () =>
    composition.prepareBlock(routedImplementation)
  const routedBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof prepareRoutedBlock
  > = Block.assemble(prepareRoutedBlock)
  const routedApplication = Program.make({
    block: routedBlock,
    container: null,
    routing: {
      onUrlRequest: request => {
        void request
        return Message.ClickedReadRootValue()
      },
      onUrlChange: url => {
        void url
        return Message.ClickedReadRootValue()
      },
    },
    devTools: { dispatch: true, mode: 'TimeTravel' },
  })
  const pendingRoutedApplication: Program.Program<
    undefined,
    void,
    ValueSource,
    never,
    Layer.Success<typeof ReadRootValue.layer>
  > = routedApplication
  void pendingRoutedApplication

  const routedFlagsImplementation = {
    init: (flags: typeof Flags.Type, _url: Url) => initWithFlags(flags),
    update,
    view: documentView,
    EffectsLayer: ReadRootValue.layer,
  }
  const prepareRoutedFlagsBlock = () =>
    composition.prepareBlock(routedFlagsImplementation)
  const routedFlagsBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof prepareRoutedFlagsBlock
  > = Block.assemble(prepareRoutedFlagsBlock)
  const routedFlagsApplication = Program.make({
    block: routedFlagsBlock,
    Flags,
    container: null,
    routing: {
      onUrlRequest: request => {
        void request
        return Message.ClickedReadRootValue()
      },
      onUrlChange: url => {
        void url
        return Message.ClickedReadRootValue()
      },
    },
  })
  const pendingRoutedFlagsApplication: Program.Program<
    undefined,
    typeof Flags.Type,
    ValueSource,
    never,
    Layer.Success<typeof ReadRootValue.layer>
  > = routedFlagsApplication
  void pendingRoutedFlagsApplication

  // @ts-expect-error A Flags Program root init must receive its Flags.
  Program.makeElement({
    block: elementBlock,
    Flags,
    flags: Effect.succeed({ initialValue: 'from flags' }),
    container: null,
  })
}
void typecheckRootCompletion

beforeEach(() => {
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('Program root Block authoring', () => {
  it('derives external dispatch from the complete generated Message Schema', () => {
    const resolved = resolveProgramDevToolsConfig(
      { dispatch: true },
      composition.Message,
    )

    if (resolved === undefined || resolved === false) {
      throw new Error('Expected external dispatch to be enabled.')
    }

    if (resolved.dispatchSchema === undefined) {
      throw new Error('Expected a derived dispatch Schema.')
    }

    const decode = Schema.decodeUnknownSync(resolved.dispatchSchema)
    const message = {
      _tag: 'GotApplicationAuthoringChildMessage',
      placement: ChildBinding.placement,
      generation: 1,
      message: ChildMessage.UpdatedChildValue({ value: 'updated' }),
    }

    expect(decode(message)).toEqual(message)
    expect(() => decode({ ...message, placement: 'unknown' })).toThrow()
  })

  it('stages primitive authoring before composition', () => {
    expectTypeOf(ApplicationDefinition.Model).toEqualTypeOf(Model)
    expectTypeOf(ApplicationDefinition.Message).toEqualTypeOf(Message)
    expect(ApplicationDefinition.makeCommand).toBeTypeOf('function')
    expect(ApplicationDefinition.makeMount).toBeTypeOf('function')
    expect(ApplicationDefinition.makeMountStream).toBeTypeOf('function')
    expect(ApplicationDefinition.makeResource).toBeTypeOf('function')
    expect(composition.makeUpdate).toBeTypeOf('function')
    expect(ApplicationDefinition.makeStep).toBeTypeOf('function')
    expect(ApplicationDefinition.makeSubscriptions).toBeTypeOf('function')
    expect(ApplicationDefinition.makeManagedResources).toBeTypeOf('function')
    expect(composition).not.toHaveProperty('makeCommand')
    expect(composition).not.toHaveProperty('makeStep')
    expect(composition.makeInit).toBeTypeOf('function')
    expect(init).not.toBe(initSource)
    expect(init().model).toEqual({
      rootValue: 'pending',
      child: { value: 'child' },
    })
    const recipe = initSource()

    expect(recipe).not.toBeTypeOf('function')
    expect(recipe).not.toHaveProperty('model')
    expect(recipe).not.toHaveProperty('commands')
    expect(ApplicationDefinition).not.toHaveProperty('makeInit')
    expect(ApplicationDefinition).not.toHaveProperty('makeView')
    expect(graphlessComposition).toHaveProperty('makeView')

    // @ts-expect-error A root Definition is not a completed reusable Block.
    void ApplicationDefinition.bind
    expect(composition.prepareBlock).toBeTypeOf('function')
    // @ts-expect-error an application can only be composed once.
    void composition.makeComposition
  })

  it('hosts a completed empty Block', () => {
    const prepare = () =>
      NoMessageComposition.prepareBlock({
        init: noMessageInit,
        update: noMessageUpdate,
        view: noMessageElementView,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof NoMessageModel,
      typeof prepare
    > = Block.assemble(prepare)
    expect(() =>
      Program.makeElement({
        block: completedBlock,
        container: document.createElement('div'),
      }),
    ).not.toThrow()
  })

  it('completes the registered graph and provides only ordinary Services', async () => {
    const container = document.createElement('div')
    container.id = 'application-authoring'
    document.body.append(container)

    const prepare = () =>
      composition.prepareBlock({
        init,
        update,
        view,
        EffectsLayer: ReadRootValue.layer,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    const element = Program.makeElement({
      block: completedBlock,
      container,
    })
    const pendingElement: Program.Element<
      undefined,
      ValueSource,
      never,
      Layer.Success<typeof ReadRootValue.layer>
    > = element
    void pendingElement

    const runnable = element.provide(
      Layer.succeed(ValueSource, { value: 'provided' }),
    )
    const handle = embed(runnable)

    try {
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('pendingchild'),
      )
      document.querySelector('button')?.click()
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('providedchild'),
      )
    } finally {
      handle.dispose()
    }
  })
})
