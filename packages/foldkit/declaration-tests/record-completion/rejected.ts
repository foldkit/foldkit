import { Context, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { resolveFamily } from 'foldkit/internal/block'
import { taggedStruct } from 'foldkit/schema'

import {
  FamilyDefinition,
  FamilyProvider,
  First,
  HostedBlock,
  HostedInMessage,
  HostedMessage,
  HostedModel,
  HostedOutMessage,
  Parent,
  Save,
  Second,
  acquireParentChildren,
  alternateParentInit,
  alternateParentUpdate,
  familyInit,
  familyUpdate,
  hostedEffectLayer,
  hostedHandlers,
  hostedInMessageUpdate,
  hostedInit,
  hostedRecordLayer,
  hostedUpdate,
  importedRecordLayer,
  parentInit,
  parentUpdate,
} from './accepted.js'
import {
  PrimaryRenderedBinding,
  RenderedParent,
  SecondaryRenderedBinding,
  renderedParentInit,
  renderedParentUpdate,
} from './view.js'

// @ts-expect-error Record completion acquires its registered children automatically.
Parent.makeLayer({
  children: [],
  init: parentInit,
  update: parentUpdate,
})

// @ts-expect-error Record completion takes Binding inventory from init's Composition.
Parent.makeLayer({
  bindings: [],
  init: parentInit,
  update: parentUpdate,
})

// @ts-expect-error Record completion cannot declare custom operations.
Parent.makeLayer({
  operations: {},
  init: parentInit,
  update: parentUpdate,
})

// @ts-expect-error Record completion requires an init plan.
Parent.makeLayer({ update: parentUpdate })

// @ts-expect-error Record completion requires an update plan.
Parent.makeLayer({ init: parentInit })

const ForeignKey = Symbol('RecordCompletionForeign')
const ForeignBlock = Block.make('RecordCompletionForeign', {
  key: ForeignKey,
  Model: Parent.Model,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const foreignComposition = ForeignBlock.makeComposition()
const foreignInit = foreignComposition.makeInit(() => ({
  model: Parent.Model.make({
    first: First.Model.make({ first: 'foreign' }),
    second: Second.Model.make({ second: 2 }),
  }),
}))
const foreignUpdate = foreignComposition.makeUpdate({})

// @ts-expect-error Structurally equal plans from a foreign Block cannot complete Parent.
Parent.makeLayer({ init: foreignInit, update: foreignUpdate })

declare const useAlternateGraph: boolean
const crossedGraph = useAlternateGraph
  ? { init: parentInit, update: alternateParentUpdate }
  : { init: alternateParentInit, update: parentUpdate }

// @ts-expect-error Every union branch must keep its init and update graph aligned.
Parent.makeLayer(crossedGraph)

const invalidAlternative = useAlternateGraph
  ? { init: parentInit, update: parentUpdate }
  : { init: alternateParentInit, update: alternateParentUpdate, operations: {} }

// @ts-expect-error Every union branch must satisfy the record completion surface.
Parent.makeLayer(invalidAlternative)

const crossedViewComposition = RenderedParent.makeComposition({
  bindings: [SecondaryRenderedBinding, PrimaryRenderedBinding],
})
const crossedView = crossedViewComposition.makeView((_model, h) => h.empty)

// @ts-expect-error The view must come from the same Composition graph as init and update.
RenderedParent.makeLayer({
  init: renderedParentInit,
  update: renderedParentUpdate,
  view: crossedView,
})

const ForeignHostedKey = Symbol('RecordCompletionForeignHosted')
const ForeignHostedBlock = Block.make('RecordCompletionForeignHosted', {
  key: ForeignHostedKey,
  Model: HostedModel,
  Message: HostedMessage,
  InMessage: HostedInMessage,
  OutMessage: HostedOutMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: {
    RequestedReport: { outMessage: HostedOutMessage.ChangedCount },
  },
})
const ForeignSave = ForeignHostedBlock.makeCommand('Save', {
  args: { value: Schema.Number },
  messages: [HostedMessage.CompletedSave],
})
const foreignHandlers = ForeignSave.toLayer(
  Effect.succeed(({ value }) =>
    Effect.succeed(HostedMessage.CompletedSave({ value })),
  ),
)

// @ts-expect-error Host handler Definitions retain their owning Block identity.
HostedBlock.makeLayer({
  init: hostedInit,
  update: hostedUpdate,
  inMessageUpdate: hostedInMessageUpdate,
  hostHandlers: [ForeignSave],
})

// @ts-expect-error A declared InMessage contract requires its matching update plan.
HostedBlock.makeLayer({
  init: hostedInit,
  update: hostedUpdate,
  hostHandlers: [Save],
})

const foreignHostedComposition = ForeignHostedBlock.makeComposition()
const foreignHostedInMessageUpdate =
  foreignHostedComposition.makeInMessageUpdate({
    RequestedSet: ForeignHostedBlock.makeFieldsStep.fromMessage(
      ({ value }: typeof HostedInMessage.RequestedSet.Type) => ({
        count: () => value,
      }),
    ),
    RequestedSave: ForeignHostedBlock.makeNoopStep(),
    RequestedReport: ForeignHostedBlock.makeOutMessageStep.fromMessage(
      ({ value }) => HostedOutMessage.ChangedCount({ value }),
    ),
  })

// @ts-expect-error A structurally compatible InMessage plan from another graph is foreign.
HostedBlock.makeLayer({
  init: hostedInit,
  update: hostedUpdate,
  inMessageUpdate: foreignHostedInMessageUpdate,
  hostHandlers: [Save],
})

export class UndeclaredStore extends Context.Service<
  UndeclaredStore,
  Readonly<{ label: string }>
>()('RecordCompletion/UndeclaredStore') {}
const UndeclaredFailure = taggedStruct('RecordCompletionUndeclaredFailure', {})
const undeclaredServiceHandlers = Save.toLayer(
  Effect.gen(function* () {
    yield* UndeclaredStore

    return ({ value }) => Effect.succeed(HostedMessage.CompletedSave({ value }))
  }),
)
const undeclaredErrorHandlers = Save.toLayer(Effect.fail(UndeclaredFailure()))
declare const selectHostAlternative: boolean
const hostLayerAlternative = selectHostAlternative
  ? hostedRecordLayer
  : hostedEffectLayer

// @ts-expect-error A foreign host Definition cannot satisfy the original provider contract.
HostedBlock.provideHandlers(foreignHandlers)(hostLayerAlternative)

// @ts-expect-error Every Layer alternative rejects undeclared host Services.
HostedBlock.provideHandlers(undeclaredServiceHandlers)(hostLayerAlternative)

// @ts-expect-error Every Layer alternative rejects undeclared host errors.
HostedBlock.provideHandlers(undeclaredErrorHandlers)(hostLayerAlternative)

const providerAlternative = selectHostAlternative
  ? hostedHandlers
  : foreignHandlers

// @ts-expect-error Every provider union branch must implement the original host Definition.
HostedBlock.provideHandlers(providerAlternative)(hostLayerAlternative)

// @ts-expect-error Family record completion also acquires its empty child inventory.
FamilyDefinition.makeLayer({
  children: [],
  init: familyInit,
  update: familyUpdate,
})

// @ts-expect-error Ordinary Block plans cannot complete a family implementation.
FamilyDefinition.makeLayer({ init: parentInit, update: parentUpdate })

// @ts-expect-error Family plans cannot complete an ordinary Block implementation.
Parent.makeLayer({ init: familyInit, update: familyUpdate })

// @ts-expect-error A family provider requires its own family implementation Layer.
resolveFamily(FamilyDefinition, FamilyProvider, () => importedRecordLayer, {
  members: { readValue: (model: typeof FamilyDefinition.Model.Type) => model },
})

export const manualEffectCompletion = Parent.makeLayer(
  Effect.gen(function* () {
    const children = yield* acquireParentChildren()

    return { children, init: parentInit, update: parentUpdate }
  }),
)

const hybridImplementation = Object.assign(
  Effect.succeed({
    children: [],
    init: hostedInit,
    update: hostedUpdate,
    inMessageUpdate: hostedInMessageUpdate,
    hostHandlers: [Save],
  }),
  {
    init: hostedInit,
    update: hostedUpdate,
    inMessageUpdate: hostedInMessageUpdate,
    hostHandlers: [Save],
  },
)

// @ts-expect-error Constructor Effects return their implementation instead of carrying record fields.
HostedBlock.makeLayer(hybridImplementation)
