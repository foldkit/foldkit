// Optional CI proof: re-infer both assemblies with assembleBlock and require
// member-wise equality with the generated contract and the assembleAs result.
import type { AssembledApplication } from '../src/block'
import type { ApplicationContract } from '../src/block.contract'
import { ApplicationComposition } from '../src/composition'
import { init } from '../src/init'
import { EffectsLayer } from '../src/layer'
import type { AssembledUi } from '../src/page/ui/block'
import type { UiContract } from '../src/page/ui/block.contract'
import { UiComposition } from '../src/page/ui/composition'
import { init as uiInit } from '../src/page/ui/init'
import { update as uiUpdate } from '../src/page/ui/update'
import { view as uiView } from '../src/page/ui/view'
import { subscriptions } from '../src/subscription'
import { update } from '../src/update'
import { view } from '../src/view/view'

const inferredApplication = ApplicationComposition.assembleBlock({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
})
const inferredUi = UiComposition.assembleBlock({
  init: uiInit,
  update: uiUpdate,
  view: uiView,
})

type Assert<T extends true> = T
type IsAny<T> = 0 extends 1 & T ? true : false
type IsNever<T> = [T] extends [never] ? true : false
type Same<A, B> = [A, B] extends [B, A] ? true : false
type SameMembers<A, B> =
  IsAny<A> extends true
    ? false
    : IsNever<A> extends true
      ? false
      : Same<keyof A, keyof B> extends true
        ? Same<{ [K in keyof A]-?: Same<A[K], B[K & keyof B]> }[keyof A], true>
        : false
export type ApplicationInferredMatchesContract = Assert<
  SameMembers<typeof inferredApplication, ApplicationContract>
>
export type ApplicationInferredMatchesChecked = Assert<
  SameMembers<typeof inferredApplication, AssembledApplication>
>
export type UiInferredMatchesContract = Assert<
  SameMembers<typeof inferredUi, UiContract>
>
export type UiInferredMatchesChecked = Assert<
  SameMembers<typeof inferredUi, AssembledUi>
>
