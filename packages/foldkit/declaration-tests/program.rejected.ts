import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Message from 'foldkit/message'
import * as Navigation from 'foldkit/navigation'
import * as Program from 'foldkit/program'
import * as Url from 'foldkit/url'

import {
  Flags,
  Model,
  PurePageBlock,
  ServiceDecodedBlock,
  ServiceDecodedProvidedElementBlock,
} from './program.accepted.js'

const RootMessage = Message.defineMessageUnion({
  RequestedNavigation: { request: Navigation.UrlRequest },
  ChangedUrl: { url: Url.Url },
})

const RejectedDeclarationPageDefinition = Block.makeDefinition(
  'RejectedDeclarationPage',
  {
    Model,
    Message: RootMessage,
  },
)
const RejectedDeclarationPageComposition =
  RejectedDeclarationPageDefinition.makeComposition()
const preparePageBlock = () =>
  RejectedDeclarationPageComposition.prepareBlock({
    init: (flags: typeof Flags.Type, _url: Url.Url) => ({
      model: Model.make({ status: flags.status }),
    }),
    update: RejectedDeclarationPageComposition.makeUpdate({
      RequestedNavigation: model => ({ model }),
      ChangedUrl: model => ({ model }),
    }),
    view: RejectedDeclarationPageComposition.makeView(model => ({
      title: model.status,
      body: null,
    })),
  })
const PageBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof preparePageBlock
> = Block.assemble(preparePageBlock)

const RejectedDeclarationElementDefinition = Block.makeDefinition(
  'RejectedDeclarationElement',
  {
    Model,
    Message: RootMessage,
  },
)
const RejectedDeclarationElementComposition =
  RejectedDeclarationElementDefinition.makeComposition()
const prepareElementBlock = () =>
  RejectedDeclarationElementComposition.prepareBlock({
    init: (flags: typeof Flags.Type) => ({
      model: Model.make({ status: flags.status }),
    }),
    update: RejectedDeclarationElementComposition.makeUpdate({
      RequestedNavigation: model => ({
        model,
      }),
      ChangedUrl: model => ({
        model,
      }),
    }),
    view: RejectedDeclarationElementComposition.makeView((model, h) =>
      h.div([], [model.status]),
    ),
  })
const ElementBlock: CompletedAssembly<typeof prepareElementBlock> =
  Block.assemble(prepareElementBlock)

const MixedView =
  globalThis.Math.random() > 0.5
    ? RejectedDeclarationElementComposition.makeView(model => ({
        title: model.status,
        body: null,
      }))
    : RejectedDeclarationElementComposition.makeView((model, h) =>
        h.div([], [model.status]),
      )
const prepareMixedBlock = () =>
  RejectedDeclarationElementComposition.prepareBlock({
    init: (flags: typeof Flags.Type) => ({
      model: Model.make({ status: flags.status }),
    }),
    update: RejectedDeclarationElementComposition.makeUpdate({
      RequestedNavigation: model => ({
        model,
      }),
      ChangedUrl: model => ({
        model,
      }),
    }),
    view: MixedView,
  })
const MixedBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareMixedBlock
> = Block.assemble(prepareMixedBlock)

const MaybeInputView =
  globalThis.Math.random() > 0.5
    ? RejectedDeclarationElementComposition.makeView((model, h) =>
        h.div([], [model.status]),
      )
    : RejectedDeclarationElementComposition.makeView.withInputs<
        Readonly<{ label: string }>
      >((model, inputs, h) => h.div([], [model.status, inputs.label]))
const prepareMaybeInputViewBlock = () =>
  RejectedDeclarationElementComposition.prepareBlock({
    init: (flags: typeof Flags.Type) => ({
      model: Model.make({ status: flags.status }),
    }),
    update: RejectedDeclarationElementComposition.makeUpdate({
      RequestedNavigation: model => ({
        model,
      }),
      ChangedUrl: model => ({
        model,
      }),
    }),
    view: MaybeInputView,
  })
const MaybeInputViewBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareMaybeInputViewBlock
> = Block.assemble(prepareMaybeInputViewBlock)

const NarrowFlags = Schema.Struct({ status: Schema.Literal('ready') })
const prepareNarrowFlagsBlock = () =>
  RejectedDeclarationElementComposition.prepareBlock({
    init: (_flags: typeof NarrowFlags.Type) => ({
      model: Model.make({ status: 'ready' }),
    }),
    update: RejectedDeclarationElementComposition.makeUpdate({
      RequestedNavigation: model => ({
        model,
      }),
      ChangedUrl: model => ({
        model,
      }),
    }),
    view: RejectedDeclarationElementComposition.makeView((model, h) =>
      h.div([], [model.status]),
    ),
  })
const NarrowFlagsBlock: CompletedAssembly<typeof prepareNarrowFlagsBlock> =
  Block.assemble(prepareNarrowFlagsBlock)
const MaybeNarrowFlagsBlock =
  globalThis.Math.random() > 0.5 ? ElementBlock : NarrowFlagsBlock

const CheckedElementBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareElementBlock
> = Block.assemble(prepareElementBlock)
const CheckedNarrowFlagsBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareNarrowFlagsBlock
> = Block.assemble(prepareNarrowFlagsBlock)
const MaybeCheckedNarrowFlagsBlock =
  globalThis.Math.random() > 0.5 ? CheckedElementBlock : CheckedNarrowFlagsBlock
const AnnotatedCheckedFlagsBlock:
  | typeof CheckedElementBlock
  | typeof CheckedNarrowFlagsBlock =
  globalThis.Math.random() > 0.5 ? CheckedElementBlock : CheckedNarrowFlagsBlock
declare const DeclaredCheckedFlagsBlock:
  | typeof CheckedElementBlock
  | typeof CheckedNarrowFlagsBlock

const ExtraRequestMessage = Message.defineMessageUnion({
  RequestedNavigationWithExtra: {
    request: Navigation.UrlRequest,
    source: Schema.String,
  },
})
const WrongRequestMessage = Message.defineMessageUnion({
  RequestedString: { request: Schema.String },
})
const ForeignRequestMessage = Message.defineMessageUnion({
  RequestedForeignNavigation: { request: Navigation.UrlRequest },
})

const AlternativeRootMessage = Message.defineMessageUnion({
  RequestedAlternativeNavigation: { request: Navigation.UrlRequest },
  ChangedAlternativeUrl: { url: Url.Url },
})
const RejectedAlternativeRoutingPageDefinition = Block.makeDefinition(
  'RejectedAlternativeRoutingPage',
  { Model, Message: AlternativeRootMessage },
)
const RejectedAlternativeRoutingPageComposition =
  RejectedAlternativeRoutingPageDefinition.makeComposition()
const prepareAlternativeRoutingBlock = () =>
  RejectedAlternativeRoutingPageComposition.prepareBlock({
    init: (_url: Url.Url) => ({
      model: Model.make({ status: 'alternative' }),
    }),
    update: RejectedAlternativeRoutingPageComposition.makeUpdate({
      RequestedAlternativeNavigation: model => ({
        model,
      }),
      ChangedAlternativeUrl: model => ({
        model,
      }),
    }),
    view: RejectedAlternativeRoutingPageComposition.makeView(model => ({
      title: model.status,
      body: null,
    })),
  })
const AlternativeRoutingBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareAlternativeRoutingBlock
> = Block.assemble(prepareAlternativeRoutingBlock)
const RejectedPrimaryRoutingPageDefinition = Block.makeDefinition(
  'RejectedPrimaryRoutingPage',
  { Model, Message: RootMessage },
)
const RejectedPrimaryRoutingPageComposition =
  RejectedPrimaryRoutingPageDefinition.makeComposition()
const preparePrimaryRoutingBlock = () =>
  RejectedPrimaryRoutingPageComposition.prepareBlock({
    init: (_url: Url.Url) => ({ model: Model.make({ status: 'primary' }) }),
    update: RejectedPrimaryRoutingPageComposition.makeUpdate({
      RequestedNavigation: model => ({
        model,
      }),
      ChangedUrl: model => ({
        model,
      }),
    }),
    view: RejectedPrimaryRoutingPageComposition.makeView(model => ({
      title: model.status,
      body: null,
    })),
  })
const PrimaryRoutingBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof preparePrimaryRoutingBlock
> = Block.assemble(preparePrimaryRoutingBlock)
const MaybeRoutingBlock =
  globalThis.Math.random() > 0.5 ? PrimaryRoutingBlock : AlternativeRoutingBlock

const configWithRootInit = {
  block: PurePageBlock,
  container: null,
  init: () => ({ model: Model.make({ status: 'duplicate' }) }),
}

// @ts-expect-error Block implementation fields cannot be supplied beside block.
Program.make(configWithRootInit)

const configWithUnsupportedField = {
  block: PurePageBlock,
  container: null,
  unsupported: true,
}

// @ts-expect-error Named Program configs cannot contain unsupported host fields.
Program.make(configWithUnsupportedField)

// @ts-expect-error Program derives the dispatch Schema from block.Message.
Program.make({
  block: PurePageBlock,
  container: null,
  devTools: { Message: RootMessage },
})

const configWithMessageDevTools = {
  block: PurePageBlock,
  container: null,
  devTools: { show: 'Always' as const, Message: RootMessage },
}

// @ts-expect-error Named Program configs cannot retain unsupported DevTools fields.
Program.make(configWithMessageDevTools)

const devToolsWithPossibleMessage =
  globalThis.Math.random() > 0.5
    ? { show: 'Always' as const }
    : { show: 'Always' as const, Message: RootMessage }
const configWithPossibleMessageDevTools = {
  block: PurePageBlock,
  container: null,
  devTools: devToolsWithPossibleMessage,
}

// @ts-expect-error Every possible DevTools object must omit unsupported fields.
Program.make(configWithPossibleMessageDevTools)

const configWithPossiblePrivateDispatchSchema =
  globalThis.Math.random() > 0.5
    ? { block: PurePageBlock, container: null }
    : {
        block: PurePageBlock,
        container: null,
        devTools: {
          show: 'Always' as const,
          dispatchSchema: RootMessage,
        },
      }

// @ts-expect-error Private runtime dispatch fields cannot enter a Program config union.
Program.make(configWithPossiblePrivateDispatchSchema)

type DynamicServiceDecodedBlock =
  | typeof ServiceDecodedBlock
  | typeof ServiceDecodedProvidedElementBlock
type DynamicServiceDecodedConfig = Readonly<{
  block: DynamicServiceDecodedBlock
  container: null
  devTools: Readonly<{ dispatch: true }>
}>
const dynamicServiceDecodedBlock: DynamicServiceDecodedBlock =
  globalThis.Math.random() > 0.5
    ? ServiceDecodedBlock
    : ServiceDecodedProvidedElementBlock
const explicitDynamicServiceDecodedProgram = Program.makeElement<
  DynamicServiceDecodedConfig,
  DynamicServiceDecodedBlock
>({
  block: dynamicServiceDecodedBlock,
  container: null,
  devTools: { dispatch: true },
})

// @ts-expect-error A dynamic Block union retains dispatch Services missing from any member's EffectsLayer.
explicitDynamicServiceDecodedProgram.start()

declare const UnresolvedHostBlock: Omit<
  typeof PurePageBlock,
  'hostHandlers' | '__blockHandlerRequirements'
> &
  Readonly<{
    hostHandlers: readonly [unknown]
    __blockHandlerRequirements: unknown
  }>
const MaybeUnresolvedHostBlock =
  globalThis.Math.random() > 0.5 ? PurePageBlock : UnresolvedHostBlock

// @ts-expect-error Every member of a root Block union must resolve its host handlers.
Program.make({ block: MaybeUnresolvedHostBlock, container: null })

Program.make({
  block: MaybeRoutingBlock,
  container: null,
  routing: {
    // @ts-expect-error Every dynamic root member must accept the URL request Message.
    onUrlRequest: RootMessage.RequestedNavigation,
    // @ts-expect-error Every dynamic root member must accept the URL change Message.
    onUrlChange: RootMessage.ChangedUrl,
  },
})

Program.make({
  block: PageBlock,
  container: null,
  Flags,
  routing: {
    // @ts-expect-error A routing constructor cannot require additional payload fields.
    onUrlRequest: ExtraRequestMessage.RequestedNavigationWithExtra,
    onUrlChange: RootMessage.ChangedUrl,
  },
})

Program.make({
  block: PageBlock,
  container: null,
  Flags,
  routing: {
    // @ts-expect-error A routing constructor must accept UrlRequest in its request field.
    onUrlRequest: WrongRequestMessage.RequestedString,
    onUrlChange: RootMessage.ChangedUrl,
  },
})

Program.make({
  block: PageBlock,
  container: null,
  Flags,
  routing: {
    // @ts-expect-error A routing constructor must produce the root Message.
    onUrlRequest: ForeignRequestMessage.RequestedForeignNavigation,
    onUrlChange: RootMessage.ChangedUrl,
  },
})

// @ts-expect-error A routed init requires routing host options.
Program.make({ block: PageBlock, container: null, Flags })

// @ts-expect-error Program.make requires a Document view.
Program.make({ block: ElementBlock, container: null, Flags })

// @ts-expect-error Program.make rejects a root view whose output may be Html.
Program.make({ block: MixedBlock, container: null, Flags })

// @ts-expect-error Program.makeElement rejects a root view whose output may be Document.
Program.makeElement({
  block: MixedBlock,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

// @ts-expect-error Every root view union member must omit view inputs.
Program.makeElement({
  block: MaybeInputViewBlock,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

// @ts-expect-error The Flags Schema output must exactly match the root init input.
Program.makeElement({
  block: NarrowFlagsBlock,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

// @ts-expect-error Every dynamic root member must accept exactly the hosted Flags type.
Program.makeElement({
  block: MaybeNarrowFlagsBlock,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

// @ts-expect-error A checked root must accept exactly the hosted Flags type.
Program.makeElement({
  block: CheckedNarrowFlagsBlock,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

// @ts-expect-error Every inferred checked root member must accept exactly the hosted Flags type.
Program.makeElement({
  block: MaybeCheckedNarrowFlagsBlock,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

// @ts-expect-error Every annotated checked root member must accept exactly the hosted Flags type.
Program.makeElement({
  block: AnnotatedCheckedFlagsBlock,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

// @ts-expect-error Every declared checked root member must accept exactly the hosted Flags type.
Program.makeElement({
  block: DeclaredCheckedFlagsBlock,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

// @ts-expect-error Program.makeElement requires a flags Effect with its Flags Schema.
Program.makeElement({ block: ElementBlock, container: null, Flags })

// @ts-expect-error Program.makeElement requires a Flags Schema with its flags Effect.
Program.makeElement({
  block: ElementBlock,
  container: null,
  flags: Effect.succeed(Flags.make({ status: 'ready' })),
})

const DeclarationHeadlessRootDefinition = Block.makeDefinition(
  'DeclarationHeadlessRoot',
  {
    Model,
    Message: RootMessage,
  },
)
const DeclarationHeadlessRootComposition =
  DeclarationHeadlessRootDefinition.makeComposition()
const prepareHeadlessBlock = () =>
  DeclarationHeadlessRootComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: DeclarationHeadlessRootComposition.makeUpdate({
      RequestedNavigation: model => ({ model }),
      ChangedUrl: model => ({ model }),
    }),
  })
const HeadlessBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareHeadlessBlock
> = Block.assemble(prepareHeadlessBlock)

const prepareHeadedBlock = () =>
  DeclarationHeadlessRootComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: DeclarationHeadlessRootComposition.makeUpdate({
      RequestedNavigation: model => ({ model }),
      ChangedUrl: model => ({ model }),
    }),
    view: DeclarationHeadlessRootComposition.makeView((model, h) =>
      h.div([], [model.status]),
    ),
  })
const HeadedBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareHeadedBlock
> = Block.assemble(prepareHeadedBlock)

// @ts-expect-error A Program root Block must have a default view.
Program.makeElement({ block: HeadlessBlock, container: null })

const MaybeHeadlessBlock =
  globalThis.Math.random() > 0.5 ? HeadedBlock : HeadlessBlock

// @ts-expect-error Every member of a root Block union must have a default view.
Program.makeElement({ block: MaybeHeadlessBlock, container: null })

const OutMessage = Message.defineMessageUnion({ CompletedRootWork: {} })
const DeclarationOutMessageRootDefinition = Block.makeDefinition(
  'DeclarationOutMessageRoot',
  {
    Model,
    Message: RootMessage,
    OutMessage,
  },
)
const DeclarationOutMessageRootComposition =
  DeclarationOutMessageRootDefinition.makeComposition()
const prepareOutMessageBlock = () =>
  DeclarationOutMessageRootComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: DeclarationOutMessageRootComposition.makeUpdate({
      RequestedNavigation: model => ({
        model,
      }),
      ChangedUrl: model => ({
        model,
      }),
    }),
    view: DeclarationOutMessageRootComposition.makeView(model => ({
      title: model.status,
      body: null,
    })),
  })
const OutMessageBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareOutMessageBlock
> = Block.assemble(prepareOutMessageBlock)

// @ts-expect-error A Program root Block cannot declare OutMessage.
Program.make({ block: OutMessageBlock, container: null })

const MaybeOutMessageBlock =
  globalThis.Math.random() > 0.5 ? PurePageBlock : OutMessageBlock

// @ts-expect-error Every member of a root Block union must omit OutMessage.
Program.make({ block: MaybeOutMessageBlock, container: null })

const DeclarationContextRootDefinition = Block.makeDefinition(
  'DeclarationContextRoot',
  {
    Model,
    Message: RootMessage,
  },
)
const DeclarationContextRootComposition =
  DeclarationContextRootDefinition.makeComposition()
const prepareContextBlock = () =>
  DeclarationContextRootComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: DeclarationContextRootComposition.makeUpdate.withContext(
      (_requiredContext: string) => ({
        RequestedNavigation: (model, _message) => ({ model }),
        ChangedUrl: (model, _message) => ({ model }),
      }),
    ),
    view: DeclarationContextRootComposition.makeView((model, h) =>
      h.div([], [model.status]),
    ),
  })
const ContextBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareContextBlock
> = Block.assemble(prepareContextBlock)

// @ts-expect-error A Program root update cannot require dispatch Context.
Program.makeElement({ block: ContextBlock, container: null })

const prepareSafeContextBlock = () =>
  DeclarationContextRootComposition.prepareBlock({
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: DeclarationContextRootComposition.makeUpdate({
      RequestedNavigation: model => ({ model }),
      ChangedUrl: model => ({ model }),
    }),
    view: DeclarationContextRootComposition.makeView((model, h) =>
      h.div([], [model.status]),
    ),
  })
const SafeContextBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareSafeContextBlock
> = Block.assemble(prepareSafeContextBlock)
const MaybeContextBlock =
  globalThis.Math.random() > 0.5 ? SafeContextBlock : ContextBlock

// @ts-expect-error Every member of a root Block union must omit required dispatch Context.
Program.makeElement({ block: MaybeContextBlock, container: null })

const DeclarationInvalidInitDefinition = Block.makeDefinition(
  'DeclarationInvalidInit',
  {
    Model,
    Message: RootMessage,
  },
)
const DeclarationInvalidInitComposition =
  DeclarationInvalidInitDefinition.makeComposition()
const prepareInvalidInitBlock = () =>
  DeclarationInvalidInitComposition.prepareBlock({
    init: (_url: Url.Url, _unexpected: string) => ({
      model: Model.make({ status: 'ready' }),
    }),
    update: DeclarationInvalidInitComposition.makeUpdate({
      RequestedNavigation: model => ({ model }),
      ChangedUrl: model => ({ model }),
    }),
    view: DeclarationInvalidInitComposition.makeView((model, h) =>
      h.div([], [model.status]),
    ),
  })
const InvalidInitBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareInvalidInitBlock
> = Block.assemble(prepareInvalidInitBlock)

// @ts-expect-error Program init supports only (), (Flags), (Url), or (Flags, Url).
Program.makeElement({ block: InvalidInitBlock, container: null })

type CompletedAssembly<Producer extends () => Block.AssemblyDraft<object>> =
  ReturnType<Producer> extends Block.AssemblyDraft<infer Completed>
    ? Completed
    : never
