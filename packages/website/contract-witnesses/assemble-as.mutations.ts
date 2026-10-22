// assembleAs mutations against the real root and Ui graphs. Each call must be
// rejected by assembleAs itself, through contract exactness or an existing
// validator. Mutations stay on one line so each directive covers the whole
// call; the formatter ignores this file.
/* oxlint-disable typescript/no-explicit-any -- U3 erases one Scoped child contract whatever its contents. */
import { Context, Effect, Layer } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ApplyTheme,
  SaveThemePreference,
} from '../src/theme'
import type {
  ApplicationDispatch,
  ApplicationImplementation,
  ApplicationUpdateRequirements,
} from '../src/block.contract'
import type { ApplicationLocalLayer } from '../src/block.lifecycle.contract'
import * as AppCommand from '../src/command'
import { ApplicationComposition } from '../src/composition'
import { LoadPlayground } from '../src/composition/home'
import { init } from '../src/init'
import { EffectsLayer } from '../src/layer'
import type { Model } from '../src/model'
import * as Subscription from '../src/subscription'
import { subscriptions } from '../src/subscription'
import { update } from '../src/update'
import { view } from '../src/view/view'
import type {
  UiDispatch,
  UiImplementation,
  UiUpdateRequirements,
  UiViewRequirements,
} from '../src/page/ui/block.contract'
import { CalendarBasicDemoBinding, UiComposition } from '../src/page/ui/composition'
import { init as uiInit } from '../src/page/ui/init'
import type { Model as UiModel } from '../src/page/ui/model'
import { update as uiUpdate } from '../src/page/ui/update'
import { view as uiView } from '../src/page/ui/view'

class AddedService extends Context.Service<
  AddedService,
  { readonly token: string }
>()('AssembleAs/AddedService') {}
class ChangedConstructorError {
  readonly _tag = 'ChangedConstructorError'
}
const AddedServiceInput = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* AddedService
  }),
)
const FailingConstructor = Layer.effectDiscard(
  Effect.fail(new ChangedConstructorError()),
)
const neverProducer = (() => {
  throw new Error('never producer')
})()
const LayerWithoutCopyLink = Layer.mergeAll(
  AppCommand.InjectAnalytics.layer,
  AppCommand.LoadBrowserEnvironment.layer,
  AppCommand.InjectSpeedInsights.layer,
  AppCommand.ScrollToTop.layer,
  AppCommand.ScrollToAnchor.layer,
  AppCommand.ScrollSidebarActiveLinkIntoView.layer,
  AppCommand.ScrollMobileMenuActiveLinkIntoView.layer,
  AppCommand.NavigateInternal.layer,
  AppCommand.LoadExternal.layer,
  ApplyTheme.layer,
  SaveThemePreference.layer,
  AppCommand.SaveSidebarState.layer,
  LoadPlayground.layer,
  Subscription.EffectsLayer,
)

type RootModel = typeof Model.Type
type RootMessage = ApplicationDispatch['Type']
type RootUpdate<Requirements> = {
  (message: RootMessage): (model: RootModel) => Update.Return<RootModel, RootMessage, Requirements>
  (model: RootModel, message: RootMessage): Update.Return<RootModel, RootMessage, Requirements>
}
type RootWithUpdate<Requirements> = Omit<ApplicationImplementation, 'update'> & Readonly<{ update: RootUpdate<Requirements> }>
type RootWithLayer<LayerValue> = Omit<ApplicationImplementation, 'EffectsLayer'> & Readonly<{ EffectsLayer: LayerValue }>
type RootEvidence = Update.RegistrationEvidenceOf<ReturnType<typeof update>>
declare const refinedRootUpdate: Block.DefinedUpdate<RootModel, Exclude<RootMessage, Readonly<{ _tag: 'ClickedCopyLink' }>>, [], never, Update.RequirementsOf<typeof update>, RootEvidence>
declare const unregisteredRootUpdate: Block.DefinedUpdate<RootModel, RootMessage, [], never, Update.RequirementsOf<typeof update>, RootEvidence | Block.RequirementOfBinding<typeof CalendarBasicDemoBinding>>

type UiModelType = typeof UiModel.Type
type UiMessage = UiDispatch['Type']
type UiUpdateWith<Requirements> = {
  (message: UiMessage): (model: UiModelType) => Update.Return<UiModelType, UiMessage, Requirements>
  (model: UiModelType, message: UiMessage): Update.Return<UiModelType, UiMessage, Requirements>
}
type UiWithUpdate<Requirements> = Omit<UiImplementation, 'update'> & Readonly<{ update: UiUpdateWith<Requirements> }>
type UiEvidence = Update.RegistrationEvidenceOf<ReturnType<typeof uiUpdate>>
declare const unregisteredUiUpdate: Block.DefinedUpdate<UiModelType, UiMessage, [], never, Update.RequirementsOf<typeof uiUpdate>, UiEvidence | Block.RequirementOfBinding<typeof import('../src/composition').SearchBinding>>
declare const foreignMountUiView: Block.OwnedAuthoredView<Block.View<UiModelType, UiMessage, Parameters<typeof uiView>[1], UiViewRequirements | Block.RequirementOfBinding<typeof import('../src/composition').SearchBinding>>, typeof UiComposition.owner, UiModelType, UiMessage, UiViewRequirements | Block.RequirementOfBinding<typeof import('../src/composition').SearchBinding>>

// Root boundary.
// @ts-expect-error R1 constructor Service added to the implementation Layer.
export const r1 = ApplicationComposition.assembleAs<ApplicationImplementation>()({ init, update, view, subscriptions, EffectsLayer: Layer.mergeAll(EffectsLayer, AddedServiceInput) })
// @ts-expect-error R2 refined update input.
export const r2 = ApplicationComposition.assembleAs<ApplicationImplementation>()({ init, update: refinedRootUpdate, view, subscriptions, EffectsLayer })
// @ts-expect-error R3 changed constructor error.
export const r3 = ApplicationComposition.assembleAs<ApplicationImplementation>()({ init, update, view, subscriptions, EffectsLayer: Layer.mergeAll(EffectsLayer, FailingConstructor) })
// @ts-expect-error R4 never producer.
export const r4 = ApplicationComposition.assembleAs<ApplicationImplementation>()({ init, update: neverProducer, view, subscriptions, EffectsLayer })
// @ts-expect-error R5 never contract.
export const r5 = ApplicationComposition.assembleAs<never>()({ init, update, view, subscriptions, EffectsLayer })
// @ts-expect-error R6 paired never contract and producer.
export const r6 = ApplicationComposition.assembleAs<never>()({ init, update: neverProducer, view, subscriptions, EffectsLayer })
// @ts-expect-error R7 under-declared update requirement (CopyLink handler erased).
export const r7 = ApplicationComposition.assembleAs<RootWithUpdate<Exclude<ApplicationUpdateRequirements, Command.HandlerOf<typeof AppCommand.CopyLink>>>>()({ init, update, view, subscriptions, EffectsLayer })
// @ts-expect-error R8 over-declared update requirement (unused InjectAnalytics handler).
export const r8 = ApplicationComposition.assembleAs<RootWithUpdate<ApplicationUpdateRequirements | Command.HandlerOf<typeof AppCommand.InjectAnalytics>>>()({ init, update, view, subscriptions, EffectsLayer })
// @ts-expect-error R9 over-declared Layer Service.
export const r9 = ApplicationComposition.assembleAs<RootWithLayer<Layer.Layer<Layer.Success<ApplicationLocalLayer>, never, Layer.Services<ApplicationLocalLayer> | AddedService>>>()({ init, update, view, subscriptions, EffectsLayer })
// @ts-expect-error R10 missing CopyLink handler, contract matching the incomplete Layer.
export const r10 = ApplicationComposition.assembleAs<RootWithLayer<typeof LayerWithoutCopyLink>>()({ init, update, view, subscriptions, EffectsLayer: LayerWithoutCopyLink })
// @ts-expect-error R11 update evidence names a Binding the root does not register.
export const r11 = ApplicationComposition.assembleAs<ApplicationImplementation>()({ init, update: unregisteredRootUpdate, view, subscriptions, EffectsLayer })

// Ui boundary.
// @ts-expect-error U1 never producer.
export const u1 = UiComposition.assembleAs<UiImplementation>()({ init: uiInit, update: neverProducer, view: uiView })
// @ts-expect-error U2 never contract.
export const u2 = UiComposition.assembleAs<never>()({ init: uiInit, update: uiUpdate, view: uiView })
// @ts-expect-error U3 under-declared update requirement (calendar child requirements erased).
export const u3 = UiComposition.assembleAs<UiWithUpdate<Exclude<UiUpdateRequirements, Block.Scoped<'calendarBasicDemo', any>>>>()({ init: uiInit, update: uiUpdate, view: uiView })
// @ts-expect-error U4 over-declared update requirement.
export const u4 = UiComposition.assembleAs<UiWithUpdate<UiUpdateRequirements | AddedService>>()({ init: uiInit, update: uiUpdate, view: uiView })
// @ts-expect-error U5 constructor Service added through an explicit Layer.
export const u5 = UiComposition.assembleAs<UiImplementation>()({ init: uiInit, update: uiUpdate, view: uiView, EffectsLayer: AddedServiceInput })
// @ts-expect-error U6 update evidence names a Binding the Ui does not register.
export const u6 = UiComposition.assembleAs<UiImplementation>()({ init: uiInit, update: unregisteredUiUpdate, view: uiView })
// @ts-expect-error U7 view requiring an unregistered Binding/Mount capability, contract matching the view.
export const u7 = UiComposition.assembleAs<Omit<UiImplementation, 'view'> & Readonly<{ view: typeof foreignMountUiView }>>()({ init: uiInit, update: uiUpdate, view: foreignMountUiView })
