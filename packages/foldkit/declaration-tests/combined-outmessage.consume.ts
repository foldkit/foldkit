import { type Effect, Layer } from 'effect'
import { Block, Command, Update } from 'foldkit'
import * as Story from 'foldkit/story'

import {
  DialogBinding,
  EditorBlock,
  EditorComposition,
  Message,
  Model,
  OutMessage,
  ParentMessage,
  ParentModel,
  RememberClose,
  ReportMessage,
  ReportOutMessage,
  Store,
  initialModel,
  inlineRecordUpdate,
  parentUpdate,
  recordUpdate,
  reportUpdate,
} from './combined-outmessage.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type ExactInlineRecordOutMessages = Expect<
  Equal<
    NonNullable<ReturnType<typeof inlineRecordUpdate>['outMessage']>,
    typeof OutMessage.Type
  >
>
export type ExactRecordOutMessages = Expect<
  Equal<
    NonNullable<ReturnType<typeof recordUpdate>['outMessage']>,
    typeof OutMessage.Type
  >
>
export type ExactModel = Expect<
  Equal<ReturnType<typeof inlineRecordUpdate>['model'], typeof Model.Type>
>
export type ExactRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof inlineRecordUpdate>,
    Block.Scoped<'dialog', Command.HandlerOf<typeof RememberClose>>
  >
>
export type ExactRecordRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof recordUpdate>,
    Update.RequirementsOf<typeof inlineRecordUpdate>
  >
>
export type ExactCommandMessage = Expect<
  Equal<
    Effect.Success<
      NonNullable<
        ReturnType<typeof inlineRecordUpdate>['commands']
      >[number]['effect']
    >,
    typeof EditorComposition.Message.Type
  >
>
export type ExactCommandError = Expect<
  Equal<
    Effect.Error<
      NonNullable<
        ReturnType<typeof inlineRecordUpdate>['commands']
      >[number]['effect']
    >,
    never
  >
>
export type ExactRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof inlineRecordUpdate>>,
    Block.RequirementOfBinding<typeof DialogBinding>
  >
>
export type ExactServices = Expect<
  Equal<Layer.Services<typeof EditorBlock.EffectsLayer>, Store>
>
export type ExactConstructorError = Expect<
  Equal<Layer.Error<typeof EditorBlock.EffectsLayer>, 'StoreUnavailable'>
>

Story.story(
  inlineRecordUpdate,
  Story.given(initialModel),
  Story.message(Message.SavedArray()),
  Story.expectOutMessage(OutMessage.Saved()),
)
Story.story(
  recordUpdate,
  Story.given(initialModel),
  Story.message(Message.SavedNestedTuple()),
  Story.expectOutMessage(OutMessage.SavedNestedTuple()),
)
Story.story(
  reportUpdate,
  Story.given(initialModel),
  Story.message(ReportMessage.Saved()),
  Story.expectOutMessage(ReportOutMessage.Saved()),
)
Story.story(
  parentUpdate,
  Story.given(ParentModel.make({ editor: initialModel, count: 0 })),
  Story.message(ParentMessage.RequestedSave()),
)

inlineRecordUpdate(
  {
    // @ts-expect-error Emitted helpers do not weaken their Model contract.
    dialog: { count: 'invalid' },
    count: 0,
  },
  Message.SavedArray(),
)
