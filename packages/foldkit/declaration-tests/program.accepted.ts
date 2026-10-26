import {
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
} from 'effect'
import * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import * as Message from 'foldkit/message'
import * as Navigation from 'foldkit/navigation'
import * as Program from 'foldkit/program'
import type * as Runtime from 'foldkit/runtime'
import * as Struct from 'foldkit/struct'
import * as Url from 'foldkit/url'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false

type Expect<Value extends true> = Value

export const Model = Schema.Struct({ status: Schema.String })
export const Flags = Schema.Struct({ status: Schema.String })
export const RootMessage = Message.defineMessageUnion({
  RequestedNavigation: { request: Navigation.UrlRequest },
  ChangedUrl: { url: Url.Url },
})

const DeclarationPageDefinition = Block.makeDefinition('DeclarationPage', {
  Model,
  Message: RootMessage,
})
const DeclarationPageComposition = DeclarationPageDefinition.makeComposition()
const pageView = DeclarationPageComposition.makeView(model => ({
  title: model.status,
  body: null,
}))
const pageUpdate = DeclarationPageComposition.makeUpdate({
  RequestedNavigation: model => ({ model }),
  ChangedUrl: model => ({ model }),
})

const preparePageBlock = () =>
  DeclarationPageComposition.prepareBlock({
    init: (flags: typeof Flags.Type, _url: Url.Url) => ({
      model: Model.make({ status: flags.status }),
    }),
    update: pageUpdate,
    view: pageView,
  })
export const PageBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof preparePageBlock
> = Block.assemble(preparePageBlock)

export const PageProgram = Program.make({
  block: PageBlock,
  container: null,
  Flags,
  routing: {
    onUrlRequest: RootMessage.RequestedNavigation,
    onUrlChange: RootMessage.ChangedUrl,
  },
})

export const CallbackPageProgram = Program.make({
  block: PageBlock,
  container: null,
  Flags,
  routing: {
    onUrlRequest: request => {
      const exactRequest: Navigation.UrlRequest = request
      // @ts-expect-error Contextual routing callbacks retain the exact UrlRequest type.
      request.missing
      return RootMessage.RequestedNavigation({ request: exactRequest })
    },
    onUrlChange: url => {
      const exactUrl: Url.Url = url
      // @ts-expect-error Contextual routing callbacks retain the exact Url type.
      url.missing
      return RootMessage.ChangedUrl({ url: exactUrl })
    },
  },
})

const DeclarationAlternativeRoutedPageDefinition = Block.makeDefinition(
  'DeclarationAlternativeRoutedPage',
  { Model, Message: RootMessage },
)
const DeclarationAlternativeRoutedPageComposition =
  DeclarationAlternativeRoutedPageDefinition.makeComposition()
const prepareAlternativeRoutedBlock = () =>
  DeclarationAlternativeRoutedPageComposition.prepareBlock({
    init: (flags: typeof Flags.Type, _url: Url.Url) => ({
      model: Model.make({ status: flags.status }),
    }),
    update: DeclarationAlternativeRoutedPageComposition.makeUpdate({
      RequestedNavigation: model => ({ model }),
      ChangedUrl: model => ({ model }),
    }),
    view: DeclarationAlternativeRoutedPageComposition.makeView(model => ({
      title: model.status,
      body: null,
    })),
  })
export const AlternativeRoutedBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareAlternativeRoutedBlock
> = Block.assemble(prepareAlternativeRoutedBlock)
export const SafeRoutedBlock =
  globalThis.Math.random() > 0.5 ? PageBlock : AlternativeRoutedBlock
export const SafeUnionRoutedProgram = Program.make({
  block: SafeRoutedBlock,
  container: null,
  Flags,
  routing: {
    onUrlRequest: RootMessage.RequestedNavigation,
    onUrlChange: RootMessage.ChangedUrl,
  },
})

const DeclarationPurePageDefinition = Block.makeDefinition(
  'DeclarationPurePage',
  {
    Model,
    Message: Schema.Never,
  },
)
const DeclarationPurePageComposition =
  DeclarationPurePageDefinition.makeComposition()
const preparePurePageBlock = () =>
  DeclarationPurePageComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: DeclarationPurePageComposition.makeUpdate({}),
    view: DeclarationPurePageComposition.makeView(model => ({
      title: model.status,
      body: null,
    })),
  })
export const PurePageBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof preparePurePageBlock
> = Block.assemble(preparePurePageBlock)
export const PurePageProgram = Program.make({
  block: PurePageBlock,
  container: null,
})
export const InspectionPageProgram = Program.make({
  block: PurePageBlock,
  container: null,
  devTools: {},
})
export const DisabledPageProgram = Program.make({
  block: PurePageBlock,
  container: null,
  devTools: false,
})
export const DispatchPageProgram = Program.make({
  block: PurePageBlock,
  container: null,
  devTools: { dispatch: true },
})

const DeclarationAlternativePageDefinition = Block.makeDefinition(
  'DeclarationAlternativePage',
  { Model, Message: Schema.Never },
)
const DeclarationAlternativePageComposition =
  DeclarationAlternativePageDefinition.makeComposition()
const prepareAlternativePageBlock = () =>
  DeclarationAlternativePageComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'alternative' }) }),
    update: DeclarationAlternativePageComposition.makeUpdate({}),
    view: DeclarationAlternativePageComposition.makeView(model => ({
      title: model.status,
      body: null,
    })),
  })
export const AlternativePageBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareAlternativePageBlock
> = Block.assemble(prepareAlternativePageBlock)
export const SafePageBlock =
  globalThis.Math.random() > 0.5 ? PurePageBlock : AlternativePageBlock
export const SafeUnionPageProgram = Program.make({
  block: SafePageBlock,
  container: null,
})

const DeclarationElementDefinition = Block.makeDefinition(
  'DeclarationElement',
  {
    Model,
    Message: RootMessage,
  },
)
const DeclarationElementComposition =
  DeclarationElementDefinition.makeComposition()
const elementView = DeclarationElementComposition.makeView((model, h) =>
  h.div([], [model.status]),
)

const prepareElementBlock = () =>
  DeclarationElementComposition.prepareBlock({
    init: (flags: typeof Flags.Type) => ({
      model: Model.make({ status: flags.status }),
    }),
    update: DeclarationElementComposition.makeUpdate({
      RequestedNavigation: model => ({ model }),
      ChangedUrl: (model, { url }) => ({
        model: Struct.modifyFields(model, { status: () => url.pathname }),
      }),
    }),
    view: elementView,
    EffectsLayer: Layer.empty,
  })
export const ElementBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareElementBlock
> = Block.assemble(prepareElementBlock)

export const ElementProgram = Program.makeElement({
  block: ElementBlock,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

export class DispatchDecoder extends Context.Service<
  DispatchDecoder,
  Readonly<{ prefix: string }>
>()('DeclarationDispatchDecoder') {}

const ServiceDecodedString = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value =>
        Effect.map(DispatchDecoder, decoder => `${decoder.prefix}${value}`),
      encode: Effect.succeed,
    }),
  ),
)
const ServiceDecodedMessage = Message.defineMessageUnion({
  SubmittedValue: { value: ServiceDecodedString },
})
const ServiceDecodedProgramDefinition = Block.makeDefinition(
  'ServiceDecodedProgram',
  {
    Model,
    Message: ServiceDecodedMessage,
  },
)
const ServiceDecodedProgramComposition =
  ServiceDecodedProgramDefinition.makeComposition()
const serviceDecodedInit = () => ({
  model: Model.make({ status: 'ready' }),
})
const serviceDecodedUpdate = ServiceDecodedProgramComposition.makeUpdate({
  SubmittedValue: (_model, { value }) => ({
    model: Model.make({ status: value }),
  }),
})
const serviceDecodedElementView = ServiceDecodedProgramComposition.makeView(
  (model, h) => h.div([], [model.status]),
)
const serviceDecodedPageView = ServiceDecodedProgramComposition.makeView(
  model => ({
    title: model.status,
    body: null,
  }),
)
const DispatchDecoderLayer = Layer.succeed(DispatchDecoder, {
  prefix: 'decoded:',
})
const prepareServiceDecodedBlock = () =>
  ServiceDecodedProgramComposition.prepareBlock({
    init: serviceDecodedInit,
    update: serviceDecodedUpdate,
    view: serviceDecodedElementView,
  })
export const ServiceDecodedBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareServiceDecodedBlock
> = Block.assemble(prepareServiceDecodedBlock)
const prepareServiceDecodedProvidedElementBlock = () =>
  ServiceDecodedProgramComposition.prepareBlock({
    init: serviceDecodedInit,
    update: serviceDecodedUpdate,
    view: serviceDecodedElementView,
    EffectsLayer: DispatchDecoderLayer,
  })
export const ServiceDecodedProvidedElementBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareServiceDecodedProvidedElementBlock
> = Block.assemble(prepareServiceDecodedProvidedElementBlock)
const prepareServiceDecodedProvidedPageBlock = () =>
  ServiceDecodedProgramComposition.prepareBlock({
    init: serviceDecodedInit,
    update: serviceDecodedUpdate,
    view: serviceDecodedPageView,
    EffectsLayer: DispatchDecoderLayer,
  })
const ServiceDecodedProvidedPageBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareServiceDecodedProvidedPageBlock
> = Block.assemble(prepareServiceDecodedProvidedPageBlock)

const ManagedDecoderProgramNamespace = Block.makeNamespace(
  'ManagedDecoderProgram',
)
const ManagedDecoder =
  ManagedDecoderProgramNamespace.makeResource<string>()('DispatchDecoder')
const ManagedDecodedString = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value => Effect.as(Effect.result(ManagedDecoder.get), value),
      encode: Effect.succeed,
    }),
  ),
)
const ManagedDecodedMessage = Message.defineMessageUnion({
  SubmittedValue: { value: ManagedDecodedString },
})
const ManagedDecoderProgramDefinition =
  ManagedDecoderProgramNamespace.makeDefinition({
    Model,
    Message: ManagedDecodedMessage,
  })
const managedDecoders = ManagedDecoderProgramDefinition.makeManagedResources(
  entry => ({
    dispatchDecoder: entry('DispatchDecoder', Schema.Option(Schema.Null), {
      resource: ManagedDecoder,
      modelToMaybeRequirements: () => Option.none<null>(),
      onAcquired: value => ManagedDecodedMessage.SubmittedValue({ value }),
      onReleased: () => ManagedDecodedMessage.SubmittedValue({ value: '' }),
      onAcquireError: () => ManagedDecodedMessage.SubmittedValue({ value: '' }),
      handler: function* () {
        return {
          acquire: () => Effect.succeed('decoded'),
          release: () => Effect.void,
        }
      },
    }),
  }),
)
const ManagedDecoderProgramComposition =
  ManagedDecoderProgramDefinition.makeComposition()
const prepareManagedDecodedBlock = () =>
  ManagedDecoderProgramComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: ManagedDecoderProgramComposition.makeUpdate({
      SubmittedValue: (model, { value }) => ({
        model: Struct.modifyFields(model, { status: () => value }),
      }),
    }),
    view: ManagedDecoderProgramComposition.makeView((model, h) =>
      h.div([], [model.status]),
    ),
    managedResources: managedDecoders,
    EffectsLayer: managedDecoders.dispatchDecoder.layer,
  })
const ManagedDecodedBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareManagedDecodedBlock
> = Block.assemble(prepareManagedDecodedBlock)
export const RunnableManagedServiceDecodedElement = Program.makeElement({
  block: ManagedDecodedBlock,
  container: null,
  devTools: { dispatch: true },
})
export const startManagedServiceDecodedElement =
  RunnableManagedServiceDecodedElement.start

export const RunnableServiceDecodedElement = Program.makeElement({
  block: ServiceDecodedProvidedElementBlock,
  container: null,
  devTools: { dispatch: true },
})
export const RunnableServiceDecodedPage = Program.make({
  block: ServiceDecodedProvidedPageBlock,
  container: null,
  devTools: { dispatch: true },
})
export const InspectionServiceDecodedElement = Program.makeElement({
  block: ServiceDecodedBlock,
  container: null,
  devTools: {},
})
export const PendingServiceDecodedElement = Program.makeElement({
  block: ServiceDecodedBlock,
  container: null,
  devTools: { dispatch: true },
})
const maybeDispatchServiceConfig =
  globalThis.Math.random() > 0.5
    ? { block: ServiceDecodedBlock, container: null }
    : {
        block: ServiceDecodedBlock,
        container: null,
        devTools: { dispatch: true as const },
      }
export const PendingMaybeDispatchServiceElement = Program.makeElement(
  maybeDispatchServiceConfig,
)
const configuredDevTools: Runtime.DevToolsConfig =
  globalThis.Math.random() > 0.5
    ? false
    : { dispatch: globalThis.Math.random() > 0.5 }
export const PendingConfiguredDispatchServiceElement = Program.makeElement({
  block: ServiceDecodedBlock,
  container: null,
  devTools: configuredDevTools,
})
export const ProvidedServiceDecodedElement =
  PendingServiceDecodedElement.provide(DispatchDecoderLayer)

class ProgramClient extends Context.Service<
  ProgramClient,
  Readonly<{ run: Effect.Effect<void> }>
>()('DeclarationProgramClient') {}

const ServiceMessage = Message.defineMessageUnion({
  RequestedWork: {},
  CompletedWork: {},
})
const DeclarationServiceProgramDefinition = Block.makeDefinition(
  'DeclarationServiceProgram',
  {
    Model,
    Message: ServiceMessage,
  },
)
const RunWork = DeclarationServiceProgramDefinition.makeCommand('RunWork', {
  messages: [ServiceMessage.CompletedWork],
  handler: function* () {
    const programClient = yield* ProgramClient
    const handlerConstruction: Effect.Effect<
      void,
      'ProgramHandlerUnavailable'
    > = Effect.void
    yield* handlerConstruction

    return () =>
      programClient.run.pipe(Effect.as(ServiceMessage.CompletedWork()))
  },
})
const DeclarationServiceProgramComposition =
  DeclarationServiceProgramDefinition.makeComposition()
const prepareServiceBlock = () =>
  DeclarationServiceProgramComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: DeclarationServiceProgramComposition.makeUpdate({
      RequestedWork: model => ({ model, commands: [RunWork()] }),
      CompletedWork: model => ({ model }),
    }),
    view: DeclarationServiceProgramComposition.makeView((model, h) =>
      h.div([], [model.status]),
    ),
    EffectsLayer: RunWork.layer,
  })
const ServiceBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareServiceBlock
> = Block.assemble(prepareServiceBlock)
export const PendingServiceElement = Program.makeElement({
  block: ServiceBlock,
  container: null,
})
const ProgramClientLayer = Layer.succeed(ProgramClient, {
  run: Effect.void,
})
export const ProvidedServiceElement =
  PendingServiceElement.provide(ProgramClientLayer)

export class RawCommandSource extends Context.Service<
  RawCommandSource,
  Readonly<{ read: Effect.Effect<string> }>
>()('DeclarationRawCommandSource') {}

const RawCommandMessage = Message.defineMessageUnion({
  RequestedRead: {},
  CompletedRead: { value: Schema.String },
})
const ReadValue = (): Command.Command<
  typeof RawCommandMessage.Type,
  never,
  RawCommandSource
> => ({
  name: 'ReadValue',
  effect: Effect.gen(function* () {
    const source = yield* RawCommandSource
    const value = yield* source.read
    return RawCommandMessage.CompletedRead({ value })
  }),
})
const DeclarationRawCommandProgramDefinition = Block.makeDefinition(
  'DeclarationRawCommandProgram',
  { Model, Message: RawCommandMessage },
)
const DeclarationRawCommandProgramComposition =
  DeclarationRawCommandProgramDefinition.makeComposition()
const prepareRawCommandBlock = () =>
  DeclarationRawCommandProgramComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: DeclarationRawCommandProgramComposition.makeUpdate({
      RequestedRead: model => ({ model, commands: [ReadValue()] }),
      CompletedRead: (model, { value }) => ({
        model: Struct.modifyFields(model, { status: () => value }),
      }),
    }),
    view: DeclarationRawCommandProgramComposition.makeView((model, h) =>
      h.div([], [model.status]),
    ),
  })
const RawCommandBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareRawCommandBlock
> = Block.assemble(prepareRawCommandBlock)
export const PendingRawCommandElement = Program.makeElement({
  block: RawCommandBlock,
  container: null,
})
export const ProvidedRawCommandElement = PendingRawCommandElement.provide(
  Layer.succeed(RawCommandSource, { read: Effect.succeed('read') }),
)

type ServiceLayerServicesAreExact = Expect<
  Equal<Layer.Services<typeof ServiceBlock.EffectsLayer>, ProgramClient>
>
type ServiceLayerErrorIsExact = Expect<
  Equal<
    Layer.Error<typeof ServiceBlock.EffectsLayer>,
    'ProgramHandlerUnavailable'
  >
>
type PendingServiceElementIsExact = Expect<
  Equal<
    typeof PendingServiceElement,
    Program.Pending<
      undefined,
      void,
      ProgramClient,
      never,
      Command.HandlerOf<typeof RunWork>,
      'Element'
    >
  >
>
type ProvidedServiceElementIsExact = Expect<
  Equal<
    typeof ProvidedServiceElement,
    Program.Element<
      undefined,
      never,
      never,
      ProgramClient | Command.HandlerOf<typeof RunWork>
    >
  >
>
type PendingRawCommandElementIsExact = Expect<
  Equal<
    typeof PendingRawCommandElement,
    Program.Pending<undefined, void, RawCommandSource, never, never, 'Element'>
  >
>
type ProvidedRawCommandElementIsExact = Expect<
  Equal<
    typeof ProvidedRawCommandElement,
    Program.Element<undefined, never, never, RawCommandSource>
  >
>
type InspectionServiceDecodedElementIsExact = Expect<
  Equal<typeof InspectionServiceDecodedElement, Program.Element>
>
type RunnableServiceDecodedElementIsExact = Expect<
  Equal<
    typeof RunnableServiceDecodedElement,
    Program.Element<undefined, never, never, DispatchDecoder>
  >
>
type RunnableServiceDecodedPageIsExact = Expect<
  Equal<
    typeof RunnableServiceDecodedPage,
    Program.Program<undefined, void, never, never, DispatchDecoder>
  >
>
type PendingServiceDecodedElementIsExact = Expect<
  Equal<
    typeof PendingServiceDecodedElement,
    Program.Pending<undefined, void, DispatchDecoder, never, never, 'Element'>
  >
>
type PendingMaybeDispatchServiceElementIsExact = Expect<
  Equal<
    typeof PendingMaybeDispatchServiceElement,
    Program.Pending<undefined, void, DispatchDecoder, never, never, 'Element'>
  >
>
type PendingConfiguredDispatchServiceElementIsExact = Expect<
  Equal<
    typeof PendingConfiguredDispatchServiceElement,
    Program.Pending<undefined, void, DispatchDecoder, never, never, 'Element'>
  >
>
type ProvidedServiceDecodedElementIsExact = Expect<
  Equal<
    typeof ProvidedServiceDecodedElement,
    Program.Element<undefined, never, never, DispatchDecoder>
  >
>
type ProgramAssertions = [
  ServiceLayerServicesAreExact,
  ServiceLayerErrorIsExact,
  PendingServiceElementIsExact,
  ProvidedServiceElementIsExact,
  PendingRawCommandElementIsExact,
  ProvidedRawCommandElementIsExact,
  InspectionServiceDecodedElementIsExact,
  RunnableServiceDecodedElementIsExact,
  RunnableServiceDecodedPageIsExact,
  PendingServiceDecodedElementIsExact,
  PendingMaybeDispatchServiceElementIsExact,
  PendingConfiguredDispatchServiceElementIsExact,
  ProvidedServiceDecodedElementIsExact,
]
const programAssertions: ProgramAssertions = [
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
]
void programAssertions
