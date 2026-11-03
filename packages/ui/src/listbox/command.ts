import { Effect, Layer, Schema } from 'effect'
import * as Dom from 'foldkit/dom'

import { AnchorConfig, anchorSetup, portalBackdrop } from '../anchor/index.js'
import { ListboxNamespace } from './namespace.js'
import {
  SEARCH_DEBOUNCE_MILLISECONDS,
  buttonSelector,
  itemSelector,
  itemsSelector,
} from './selectors.js'
import { Message } from './types.js'

/** Prevents page scrolling while the listbox is open in modal mode. */
export const LockListboxScroll = ListboxNamespace.makeCommand(
  'LockListboxScroll',
  {
    messages: [Message.CompletedLockListboxScroll],
    handler: function* () {
      return () =>
        Dom.lockScroll.pipe(Effect.as(Message.CompletedLockListboxScroll()))
    },
  },
)
/** Re-enables page scrolling after the listbox closes. */
export const UnlockListboxScroll = ListboxNamespace.makeCommand(
  'UnlockListboxScroll',
  {
    messages: [Message.CompletedUnlockListboxScroll],
    handler: function* () {
      return () =>
        Dom.unlockScroll.pipe(Effect.as(Message.CompletedUnlockListboxScroll()))
    },
  },
)
/** Marks all elements outside the listbox as inert for modal behavior. */
export const InertListboxOthers = ListboxNamespace.makeCommand(
  'InertListboxOthers',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedInertListboxOthers],
    handler: function* () {
      return ({ id }) =>
        Dom.inertOthers(id, [buttonSelector(id), itemsSelector(id)]).pipe(
          Effect.as(Message.CompletedInertListboxOthers()),
        )
    },
  },
)
/** Removes the inert attribute from elements outside the listbox. */
export const RestoreListboxInert = ListboxNamespace.makeCommand(
  'RestoreListboxInert',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedRestoreListboxInert],
    handler: function* () {
      return ({ id }) =>
        Dom.restoreInert(id).pipe(
          Effect.as(Message.CompletedRestoreListboxInert()),
        )
    },
  },
)
/** Moves focus back to the listbox button after closing. */
export const FocusListboxButton = ListboxNamespace.makeCommand(
  'FocusListboxButton',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedFocusListboxButton],
    handler: function* () {
      return ({ id }) =>
        Dom.focus(buttonSelector(id)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusListboxButton()),
        )
    },
  },
)
/** Moves focus to the listbox items container after opening. */
export const FocusListboxItems = ListboxNamespace.makeCommand(
  'FocusListboxItems',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedFocusListboxItems],
    handler: function* () {
      return ({ id }) =>
        Dom.focus(itemsSelector(id)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusListboxItems()),
        )
    },
  },
)
/** Scrolls the active listbox item into view after keyboard navigation. */
export const ScrollListboxItemIntoView = ListboxNamespace.makeCommand(
  'ScrollListboxItemIntoView',
  {
    args: { id: Schema.String, index: Schema.Number },
    messages: [Message.CompletedScrollListboxItemIntoView],
    handler: function* () {
      return ({ id, index }) =>
        Dom.scrollIntoView(itemSelector(id, index)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedScrollListboxItemIntoView()),
        )
    },
  },
)
/** Programmatically clicks the active listbox item's DOM element. */
export const ClickListboxItem = ListboxNamespace.makeCommand(
  'ClickListboxItem',
  {
    args: { id: Schema.String, index: Schema.Number },
    messages: [Message.CompletedClickListboxItem],
    handler: function* () {
      return ({ id, index }) =>
        Dom.clickElement(itemSelector(id, index)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedClickListboxItem()),
        )
    },
  },
)
/** Waits for the typeahead search debounce period before clearing the query. */
export const DelayClearListboxSearch = ListboxNamespace.makeCommand(
  'DelayClearListboxSearch',
  {
    args: { version: Schema.Number },
    messages: [Message.CompletedDelayClearListboxSearch],
    handler: function* () {
      return ({ version }) =>
        Effect.sleep(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
          Effect.as(Message.CompletedDelayClearListboxSearch({ version })),
        )
    },
  },
)
/** Detects whether the listbox button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation block that leave is complete. */
export const DetectListboxMovementOrAnimationEnd = ListboxNamespace.makeCommand(
  'DetectListboxMovementOrAnimationEnd',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.CompletedDetectListboxMovementOrAnimationEnd],
    handler: function* () {
      return ({ id, generation }) =>
        Effect.raceFirst(
          Dom.detectElementMovement(buttonSelector(id)).pipe(
            Effect.as(
              Message.CompletedDetectListboxMovementOrAnimationEnd({
                generation,
              }),
            ),
          ),
          Dom.waitForAnimationSettled(itemsSelector(id)).pipe(
            Effect.as(
              Message.CompletedDetectListboxMovementOrAnimationEnd({
                generation,
              }),
            ),
          ),
        )
    },
  },
)

/**
 * The anchor-positioning Mount this Listbox renders on its items panel.
 *  The panel is always anchored to the button via Floating UI and portaled
 *  to the document body, or into the enclosing `<dialog>` when there is one
 *  (opt out of portaling with `anchor.portal: false`), so it escapes ancestor
 *  stacking contexts and overflow clipping.
 *
 *  It also carries the open-focus for the anchored panel. An anchored panel
 *  renders `visibility: hidden` until Floating UI resolves its first position,
 *  and `.focus()` does not land on a hidden element, so `FocusListboxItems` alone
 *  cannot focus it. `focusAfterPosition` focuses the panel as part of that
 *  first reveal. `FocusListboxItems` still focuses the panel when no anchor is
 *  configured, where the panel is visible as soon as the render commits.
 *
 *  Exposed so Scene tests can call
 *  `Scene.Mount.resolve(AnchorListbox, CompletedAnchorListbox())`.
 */
export const AnchorListbox = ListboxNamespace.makeMount('AnchorListbox', {
  args: { buttonId: Schema.String, anchor: AnchorConfig },
  messages: [Message.CompletedAnchorListbox],
  handler: function* () {
    return ({ element, buttonId, anchor }) =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            anchorSetup(element, {
              buttonId,
              anchor,
              focusAfterPosition: true,
            }),
          ),
          cleanup => Effect.sync(cleanup),
        )
        return Message.CompletedAnchorListbox()
      })
  },
})

/** The backdrop-portaling Mount this Listbox renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalListboxBackdrop, CompletedPortalListboxBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalListboxBackdrop = ListboxNamespace.makeMount(
  'PortalListboxBackdrop',
  {
    messages: [Message.CompletedPortalListboxBackdrop],
    handler: function* () {
      return ({ element }) =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => portalBackdrop(element)),
            cleanup => Effect.sync(cleanup),
          )
          return Message.CompletedPortalListboxBackdrop()
        })
    },
  },
)

/** Mount Definitions rendered by Listbox views. */
export const mounts = [AnchorListbox, PortalListboxBackdrop]

/** Provides Listbox's local Command and Mount handlers. */
export const EffectsLayer = Layer.mergeAll(
  LockListboxScroll.layer,
  UnlockListboxScroll.layer,
  InertListboxOthers.layer,
  RestoreListboxInert.layer,
  FocusListboxButton.layer,
  FocusListboxItems.layer,
  ScrollListboxItemIntoView.layer,
  ClickListboxItem.layer,
  DelayClearListboxSearch.layer,
  DetectListboxMovementOrAnimationEnd.layer,
  AnchorListbox.layer,
  PortalListboxBackdrop.layer,
)
