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

import { define } from '../block/define.js'
import type * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import type { Url } from '../url/index.js'
import type {
  Application as ApplicationProgram,
  Element as ElementProgram,
  ViewBuilderFor,
} from './applicationPublic.js'
import { define as defineApplication } from './applicationPublic.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import { embed } from './start.js'

class ValueSource extends Context.Service<
  ValueSource,
  Readonly<{ value: string }>
>()('ApplicationAuthoring/ValueSource') {}

const Child = define('ApplicationAuthoringChild')
const ChildModel = Schema.Struct({ value: Schema.String })
const ChildMessage = defineMessageUnion({
  UpdatedChildValue: { value: Schema.String },
})
const child = Child.define({ Model: ChildModel, Message: ChildMessage })
const ChildComposition = child.makeComposition()
const childBlock = ChildComposition.makeBlock({
  init: () => ({ model: { value: 'child' } }),
  update: ChildComposition.makeUpdate((model, { value }) => ({
    model: modifyFields(model, { value: () => value }),
  })),
  view: ChildComposition.makeView((model, h) => h.span([], [model.value])),
})

const Model = Schema.Struct({
  rootValue: Schema.String,
  child: ChildModel,
})
const Message = defineMessageUnion({
  ClickedReadRootValue: {},
  CompletedReadRootValue: { value: Schema.String },
  GotChildMessage: { message: ChildMessage },
})
const ForeignMessage = defineMessageUnion({ ForeignCompleted: {} })
const Application = defineApplication({ Model, Message })
const graphlessComposition = Application.makeComposition()
const ReadRootValue = Application.command('ReadRootValue', {
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
const ObserveRoot = Application.mount('ObserveRoot', {
  messages: [Message.CompletedReadRootValue],
  handler: function* () {
    return () =>
      Effect.succeed(Message.CompletedReadRootValue({ value: 'mounted' }))
  },
})
const mountedComposition = Application.makeComposition({
  mounts: [ObserveRoot],
})
const mountedView = mountedComposition.makeView((model, h) =>
  h.div([h.OnMount(ObserveRoot())], [model.rootValue]),
)
const ChildBinding = Application.bindChild(childBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, { child: () => nextChild }),
  parentMessage: Message.GotChildMessage,
})
const composition = Application.makeComposition({
  childBindings: [ChildBinding],
})
const initSource = () =>
  ChildBinding.init({
    args: [],
    toParentModel: child => ({ rootValue: 'pending', child }),
  })
const init = composition.makeInit(initSource)
const update = composition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedReadRootValue: () => ({
      model,
      commands: [ReadRootValue()],
    }),
    CompletedReadRootValue: ({ value }) => ({
      model: modifyFields(model, { rootValue: () => value }),
    }),
  }),
)
expectTypeOf<Update.RequirementsOf<typeof update>>().toEqualTypeOf<
  Command.HandlerOf<typeof ReadRootValue>
>()
const rootBody = (
  model: typeof Model.Type,
  h: ViewBuilderFor<typeof composition>,
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
const NoMessageApplication = defineApplication({
  Model: NoMessageModel,
  Message: Schema.Never,
})
const NoMessageComposition = NoMessageApplication.makeComposition()
const noMessageInit = () => ({ model: null })
const noMessageUpdate = NoMessageComposition.makeUpdate()
const noMessageDocumentView = NoMessageComposition.makeView((_model, h) => ({
  title: 'No messages',
  body: h.empty,
}))
const noMessageElementView = NoMessageComposition.makeView(
  (_model, h) => h.empty,
)

const typecheckRootCompletion = (): void => {
  // @ts-expect-error An Application Definition does not author the primary view.
  Application.makeView
  // @ts-expect-error An Application Definition does not expose the Composition-owned init helper.
  Application.makeInit

  Application.command('AcceptedCommand', {
    messages: [Message.CompletedReadRootValue],
  })
  Application.mount('AcceptedMount', {
    messages: [Message.CompletedReadRootValue],
  })
  Application.mountStream('AcceptedMountStream', {
    messages: [Message.CompletedReadRootValue],
  })

  Application.command('ForeignCommand', {
    // @ts-expect-error Root Commands must produce the Application Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  Application.mount('ForeignMount', {
    // @ts-expect-error Root Mounts must produce the Application Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  Application.mountStream('ForeignMountStream', {
    // @ts-expect-error Root stream Mounts must produce the Application Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  // @ts-expect-error Primitive authoring remains on the Application Definition.
  composition.command

  composition.makeUpdate((model, message) =>
    // @ts-expect-error Composition routes the registered child Message.
    Message.match(message, {
      ClickedReadRootValue: () => ({ model }),
      CompletedReadRootValue: () => ({ model }),
      GotChildMessage: () => ({ model }),
    }),
  )

  composition.makeElement({
    container: null,
    init,
    update,
    view: graphlessElementView,
    EffectsLayer: ReadRootValue.layer,
  })

  const application = composition.makeApplication({
    container: null,
    init,
    update,
    view: documentView,
    EffectsLayer: ReadRootValue.layer,
  })
  const pendingApplication: ApplicationProgram<
    undefined,
    void,
    ValueSource,
    never,
    Layer.Success<typeof ReadRootValue.layer>
  > = application
  void pendingApplication

  NoMessageComposition.makeApplication({
    container: null,
    init: noMessageInit,
    update: noMessageUpdate,
    view: noMessageDocumentView,
  })
  NoMessageComposition.makeElement({
    container: null,
    init: noMessageInit,
    update: noMessageUpdate,
    view: noMessageElementView,
  })

  // @ts-expect-error makeApplication requires the registered Document view.
  composition.makeApplication({
    container: null,
    init,
    update,
    view,
    EffectsLayer: ReadRootValue.layer,
  })

  // @ts-expect-error makeElement requires the registered Element view.
  composition.makeElement({
    container: null,
    init,
    update,
    view: documentView,
    EffectsLayer: ReadRootValue.layer,
  })

  // @ts-expect-error The graphless Composition has not registered the child used by this view.
  Application.makeComposition().makeElement({
    container: null,
    init,
    update,
    view,
    EffectsLayer: ReadRootValue.layer,
  })

  // @ts-expect-error The graphless Composition has not registered the Mount used by this view.
  Application.makeComposition().makeElement({
    container: null,
    init,
    update,
    view: mountedView,
    EffectsLayer: Layer.merge(ReadRootValue.layer, ObserveRoot.layer),
  })

  // @ts-expect-error root handler definitions must be included in EffectsLayer.
  composition.makeElement({
    container: null,
    init,
    update,
    view,
  })

  composition.makeElement({
    // @ts-expect-error Model is established by defineApplication.
    Model,
    container: null,
    init,
    update,
    view,
    EffectsLayer: ReadRootValue.layer,
  })

  const Flags = Schema.Struct({ initialValue: Schema.String })
  const initWithFlags = (flags: typeof Flags.Type) => ({
    model: {
      rootValue: flags.initialValue,
      child: { value: 'child' },
    },
  })
  const elementWithFlags = composition.makeElement({
    Flags,
    flags: Effect.succeed({ initialValue: 'from flags' }),
    container: null,
    init: initWithFlags,
    update,
    view,
    EffectsLayer: ReadRootValue.layer,
  })
  const pendingElementWithFlags: ElementProgram<
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
  const routedApplication = composition.makeApplication({
    ...routedImplementation,
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
    devTools: { Message, mode: 'TimeTravel' },
  })
  const pendingRoutedApplication: ApplicationProgram<
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
  const routedFlagsApplication = composition.makeApplication({
    ...routedFlagsImplementation,
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
  const pendingRoutedFlagsApplication: ApplicationProgram<
    undefined,
    typeof Flags.Type,
    ValueSource,
    never,
    Layer.Success<typeof ReadRootValue.layer>
  > = routedFlagsApplication
  void pendingRoutedFlagsApplication

  // @ts-expect-error a Flags application init must receive its Flags.
  composition.makeElement({
    Flags,
    flags: Effect.succeed({ initialValue: 'from flags' }),
    container: null,
    init,
    update,
    view,
    EffectsLayer: ReadRootValue.layer,
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

describe('Application authoring', () => {
  it('stages primitive authoring before composition', () => {
    expectTypeOf(Application.Model).toEqualTypeOf(Model)
    expectTypeOf(Application.Message).toEqualTypeOf(Message)
    expect(Application.command).toBeTypeOf('function')
    expect(Application.mount).toBeTypeOf('function')
    expect(Application.mountStream).toBeTypeOf('function')
    expect(Application.resource).toBeTypeOf('function')
    expect(composition.makeUpdate).toBeTypeOf('function')
    expect(Application.step).toBeTypeOf('function')
    expect(Application.subscriptions).toBeTypeOf('function')
    expect(Application.managedResources).toBeTypeOf('function')
    expect(composition).not.toHaveProperty('command')
    expect(composition).not.toHaveProperty('step')
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
    expect(Application).not.toHaveProperty('makeInit')
    expect(Application).not.toHaveProperty('makeView')
    expect(graphlessComposition).toHaveProperty('makeView')

    // @ts-expect-error an application root is not a reusable Block.
    void Application.bind
    // @ts-expect-error an Application composition does not expose Block completion.
    void composition.makeBlock
    // @ts-expect-error an application can only be composed once.
    void composition.makeComposition
  })

  it('completes an empty composition through its owned method', () => {
    expect(() =>
      NoMessageComposition.makeElement({
        container: document.createElement('div'),
        init: noMessageInit,
        update: noMessageUpdate,
        view: noMessageElementView,
      }),
    ).not.toThrow()
  })

  it('completes the registered graph and provides only ordinary Services', async () => {
    const container = document.createElement('div')
    container.id = 'application-authoring'
    document.body.append(container)

    const element = composition.makeElement({
      container,
      init,
      update,
      view,
      EffectsLayer: ReadRootValue.layer,
    })
    const pendingElement: ElementProgram<
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
