import { Effect, HashMap, Layer, Schema } from 'effect'
import { Block, Message } from 'foldkit'

import { ChildBlock, ChildModel, ChildOutMessage, Choice } from './child.js'
import {
  EntriesBinding,
  EntryId,
  NumberedEntriesBinding,
  ParentBlock,
  composition,
  foldSelection,
  update,
} from './parent.js'

const entries = ParentBlock.makeRecordBinding(ChildBlock, { field: 'entries' })

entries.withOutMessagePolicy({
  // @ts-expect-error The occurrence key is a branded string, not a number.
  fold: (_key: number) => foldSelection,
})

// @ts-expect-error Every child OutMessage variant needs a handler.
ParentBlock.makeOutMessageFold(ChildBlock, {
  Selected: ParentBlock.makeNoopStep,
})

// @ts-expect-error Selected carries a Choice, not a number.
ParentBlock.makeOutMessageFold(ChildBlock, {
  Selected: ({ value: _value }: Readonly<{ value: number }>) =>
    ParentBlock.makeNoopStep(),
  Closed: ParentBlock.makeNoopStep,
})

const ForeignKey = Symbol('ForeignKeyedFoldChild')
const ForeignBlock = Block.make('ForeignKeyedFoldChild', {
  key: ForeignKey,
  Model: Schema.Struct({ count: Schema.Number }),
  Message: Schema.Never,
  isMessageFree: true,
  OutMessage: Message.defineMessageUnion({ Escaped: {} }),
  InitArgs: Schema.Tuple([]),
})
const foreignFold = ParentBlock.makeOutMessageFold(ForeignBlock, {
  Escaped: ParentBlock.makeNoopStep,
})
entries.withOutMessagePolicy({
  // @ts-expect-error A direct fold must use this child's exact OutMessage union.
  fold: foreignFold,
})
const producedForeign = entries.withOutMessagePolicy({
  fold: _key => foreignFold,
})
// @ts-expect-error A produced fold must use this child's exact OutMessage union.
ParentBlock.makeComposition({ bindings: [producedForeign] })

const ForeignMessage = Message.defineMessageUnion({ CompletedForeign: {} })
const SameOutMessageForeignKey = Symbol('SameOutMessageForeignChild')
const SameOutMessageForeignBlock = Block.make('SameOutMessageForeignChild', {
  key: SameOutMessageForeignKey,
  Model: ChildModel,
  Message: ForeignMessage,
  OutMessage: ChildOutMessage,
  InitArgs: Schema.Tuple([]),
})
const CompleteForeign = SameOutMessageForeignBlock.makeCommand(
  'CompleteForeign',
  { messages: [ForeignMessage.CompletedForeign] },
)
const sameOutMessageForeignFold = ParentBlock.makeOutMessageFold(
  SameOutMessageForeignBlock,
  {
    Selected: (_outMessage, { liftCommand }) =>
      ParentBlock.makeCommandsStep(() => [liftCommand(CompleteForeign())]),
    Closed: ParentBlock.makeNoopStep,
  },
)
entries.withOutMessagePolicy({
  // @ts-expect-error A direct fold must use this child's exact Message contract for FoldContext.
  fold: sameOutMessageForeignFold,
})
const producedSameOutMessageForeignFold = entries.withOutMessagePolicy({
  fold: _key => sameOutMessageForeignFold,
})
// @ts-expect-error A produced fold must use this child's exact Message contract for FoldContext.
ParentBlock.makeComposition({
  bindings: [producedSameOutMessageForeignFold],
})

const ExtraPayloadKey = Symbol('ExtraPayloadFoldChild')
const ExtraPayloadBlock = Block.make('ExtraPayloadFoldChild', {
  key: ExtraPayloadKey,
  Model: ChildModel,
  Message: Schema.Never,
  isMessageFree: true,
  OutMessage: Message.defineMessageUnion({
    Selected: { value: Choice, label: Schema.optionalKey(Schema.String) },
    Closed: {},
  }),
  InitArgs: Schema.Tuple([]),
})
const extraPayload = entries.withOutMessagePolicy({
  fold: () =>
    ParentBlock.makeOutMessageFold(ExtraPayloadBlock, {
      Selected: ParentBlock.makeNoopStep,
      Closed: ParentBlock.makeNoopStep,
    }),
})
// @ts-expect-error Mutual assignability does not establish the exact child payload contract.
ParentBlock.makeComposition({ bindings: [extraPayload] })

const rawMatcher = entries.withOutMessagePolicy({
  fold: () =>
    ChildOutMessage.match({
      Selected: ParentBlock.makeNoopStep,
      Closed: ParentBlock.makeNoopStep,
    }),
})
// @ts-expect-error Returned folds need the authored helper's checked contract.
ParentBlock.makeComposition({ bindings: [rawMatcher] })

const WrongParentKey = Symbol('WrongKeyedFoldParent')
const WrongParentBlock = Block.make('WrongKeyedFoldParent', {
  key: WrongParentKey,
  Model: Schema.Struct({ title: Schema.String }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const wrongModel = entries.withOutMessagePolicy({
  fold: () =>
    WrongParentBlock.makeOutMessageFold(ChildBlock, {
      Selected: WrongParentBlock.makeNoopStep,
      Closed: WrongParentBlock.makeNoopStep,
    }),
})
// @ts-expect-error A produced fold's Step must receive and return the parent Model.
ParentBlock.makeComposition({ bindings: [wrongModel] })

const missingBinding = ParentBlock.makeRecordBinding(ChildBlock, {
  field: 'entries',
  placement: 'unregisteredEntries',
}).withOutMessagePolicy({ fold: foldSelection })
const unregistered = entries.withOutMessagePolicy({
  fold: key =>
    ParentBlock.makeOutMessageFold(ChildBlock, {
      Selected: ({ value }) => missingBinding.requestChoose(key, { value }),
      Closed: ParentBlock.makeNoopStep,
    }),
})
// @ts-expect-error The produced Step requires the original sibling Binding to be registered.
ParentBlock.makeComposition({ bindings: [unregistered] })

const badOutput = entries.withOutMessagePolicy({
  fold: () =>
    ParentBlock.makeOutMessageForward(ChildBlock, {
      Selected: ({ value }) => ChildOutMessage.Selected({ value }),
      Closed: () => undefined,
    }),
})
// @ts-expect-error A forwarding helper cannot supply a parent Step.
ParentBlock.makeComposition({ bindings: [badOutput] })

// @ts-expect-error The parent RecordSelection Command still needs its handler Layer.
ParentBlock.makeLayer(
  Effect.gen(function* () {
    const entries = yield* EntriesBinding
    const numberedEntries = yield* NumberedEntriesBinding

    return {
      children: [entries, numberedEntries],
      init: composition.makeInit(() => ({
        model: {
          entries: {},
          numberedEntries: HashMap.empty(),
          selected: 'Apple',
          selectedId: '',
          beforeCount: 0,
        },
      })),
      update,
      EffectsLayer: Layer.empty,
    }
  }),
)

// @ts-expect-error The occurrence API retains its exact branded key.
entries.requestChoose(1, { value: 'Apple' })
// @ts-expect-error The incoming child payload stays narrowed to Choice.
entries.requestChoose(EntryId.make('first'), { value: 'Banana' })

const SingleKey = Symbol('SingleFoldParent')
const SingleBlock = Block.make('SingleFoldParent', {
  key: SingleKey,
  Model: Schema.Struct({ child: ChildModel }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
const unkeyed = SingleBlock.makeRequiredFieldBinding(ChildBlock, {
  field: 'child',
}).withOutMessagePolicy({
  fold: () =>
    SingleBlock.makeOutMessageFold(ChildBlock, {
      Selected: SingleBlock.makeNoopStep,
      Closed: SingleBlock.makeNoopStep,
    }),
})
// @ts-expect-error Only keyed Bindings accept a producer of an OutMessage fold.
SingleBlock.makeComposition({ bindings: [unkeyed] })
