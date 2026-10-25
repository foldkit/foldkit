import {
  ChildModel,
  EntriesBindingWithOutMessagePolicy,
  InlinePolicyComposition,
  InlinePolicyBlock,
  LeftBindingWithInlineOutMessagePolicy,
  LeftBindingWithOutMessagePolicy,
  LeftBindingWithReselectedOutMessagePolicy,
  ParentComposition,
  ParentDefinition,
  ParentModel,
  ReciprocalPolicyBlock,
  ReciprocalPolicyComposition,
  RefinedBindingWithInlineOutMessagePolicy,
  RefinedInlinePolicyComposition,
  RightBindingWithOutMessagePolicy,
  foldLeftOutMessage,
} from './outmessage-policy-selection.accepted.js'

export const emittedOperation = LeftBindingWithOutMessagePolicy.reset()
export const emittedInit = LeftBindingWithOutMessagePolicy.init({
  args: [],
  toParentModel: child =>
    ParentModel.make({
      left: child,
      right: ChildModel.make({ value: '' }),
      entries: [],
    }),
})
export const emittedView = LeftBindingWithOutMessagePolicy.embedView({
  slotId: 'emitted-left',
  model: ChildModel.make({ value: '' }),
})
export const emittedUpdate = ParentComposition.makeUpdate({
  Reflected: model => ({ model }),
})
export const emittedInlineUpdate = InlinePolicyComposition.makeUpdate({
  Reflected: model => ({
    model,
  }),
})
export const emittedReciprocalUpdate = ReciprocalPolicyComposition.makeUpdate({
  Reflected: model => ({ model }),
})
export const emittedInlineOperation =
  LeftBindingWithInlineOutMessagePolicy.reset()
export const emittedRefinedInlineOperation =
  RefinedBindingWithInlineOutMessagePolicy.reset()
export const emittedRefinedInlineUpdate =
  RefinedInlinePolicyComposition.makeUpdate({
    Reflected: model => ({ model }),
  })
export const emittedReselection =
  LeftBindingWithReselectedOutMessagePolicy.withOutMessagePolicy({
    fold: foldLeftOutMessage,
  })

void EntriesBindingWithOutMessagePolicy
void RightBindingWithOutMessagePolicy
void InlinePolicyBlock
void ReciprocalPolicyBlock

export const emittedReusedComposition = ParentDefinition.makeComposition({
  bindings: ParentComposition.bindings,
})
