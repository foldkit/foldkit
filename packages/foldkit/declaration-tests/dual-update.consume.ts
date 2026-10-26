import { Command, Update } from 'foldkit'
import type { RequirementOfBinding } from 'foldkit/block'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import {
  CounterComposition,
  EarlyReturnBlock,
  GraphFullBlock,
  GraphFullChildBinding,
  GraphFullModel,
  GraphFullOutMessage,
  GraphFullSave,
  Message,
  Model,
  OutMessage,
  Save,
  TernaryBlock,
  changedCount,
  combineGenericSteps,
  earlyReturnUpdate,
  graphFullMessage,
  graphFullUpdate,
  reportUpdate,
  requiredContextUpdate,
  ternaryUpdate,
  update,
} from './dual-update.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

const changedCountStep = update(changedCount)
const initial = Model.make({ count: 0 })
const combined = Update.combineSteps(initial, [
  changedCountStep,
  update(changedCount),
])
const genericCombined = combineGenericSteps(initial, [changedCountStep])
const contextual = requiredContextUpdate(changedCount)(initial, {
  multiplier: 2,
})
const fullStep = GraphFullBlock.update(graphFullMessage)
const view = (model: typeof Model.Type, h: HtmlBuilder<typeof Message.Type>) =>
  h.button(
    [h.OnClick(changedCount), h.Type('button')],
    [globalThis.String(model.count)],
  )

Story.story(
  reportUpdate,
  Story.given(initial),
  Story.message(changedCount),
  Story.expectOutMessage(OutMessage.ReportedCount({ count: 2 })),
)
Scene.scene(
  { update: reportUpdate, view },
  Scene.given(initial),
  Scene.click(Scene.role('button')),
  Scene.expectOutMessage(OutMessage.ReportedCount({ count: 2 })),
)
export type ExactModel = Expect<Equal<typeof combined.model, typeof Model.Type>>
export type ExactGenericRequirements = Expect<
  Equal<
    Update.RequirementsOf<() => typeof genericCombined>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactContextualModel = Expect<
  Equal<typeof contextual.model, typeof Model.Type>
>
export type ExactCompletedModel = Expect<
  Equal<Parameters<typeof fullStep>[0], typeof GraphFullModel.Type>
>
export type ExactMixedRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof graphFullUpdate>,
    Command.HandlerOf<typeof GraphFullSave>
  >
>
export type ExactMixedOutMessage = Expect<
  Equal<
    ReturnType<typeof graphFullUpdate> extends Readonly<{
      outMessage?: infer OutMessage
    }>
      ? Exclude<OutMessage, undefined>
      : never,
    ReturnType<typeof GraphFullOutMessage.ReportedCount>
  >
>
export type ExactMixedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof graphFullUpdate>>,
    RequirementOfBinding<typeof GraphFullChildBinding>
  >
>

export type ExactTernaryReturn = Expect<
  Equal<
    ReturnType<typeof ternaryUpdate>,
    Update.ReturnWithOutMessage<
      typeof Model.Type,
      typeof Message.Type,
      ReturnType<typeof OutMessage.ReportedCount>,
      Command.HandlerOf<typeof Save>
    >
  >
>
export type ExactEarlyReturn = Expect<
  Equal<ReturnType<typeof earlyReturnUpdate>, ReturnType<typeof ternaryUpdate>>
>
export type ExactTernaryRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof ternaryUpdate>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactEarlyReturnRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof earlyReturnUpdate>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactCompletedTernaryReturn = Expect<
  Equal<
    ReturnType<typeof TernaryBlock.update>,
    ReturnType<typeof ternaryUpdate>
  >
>
export type ExactCompletedEarlyReturn = Expect<
  Equal<
    ReturnType<typeof EarlyReturnBlock.update>,
    ReturnType<typeof earlyReturnUpdate>
  >
>

const rejectMissingBranchHandlers = () => {
  // @ts-expect-error Emitted ternary Commands still require their handler.
  CounterComposition.prepareBlock({
    init: () => ({ model: initial }),
    update: ternaryUpdate,
  })
  // @ts-expect-error Emitted early-return Commands still require their handler.
  CounterComposition.prepareBlock({
    init: () => ({ model: initial }),
    update: earlyReturnUpdate,
  })
}
void rejectMissingBranchHandlers
void changedCountStep
