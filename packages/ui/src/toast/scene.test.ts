import { Duration, Option, Schema } from 'effect'
import { type Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import {
  type EntryHandlers,
  SwipeState,
  type Variant,
  WaitBeforeDismissal,
  WaitForSwipeSettled,
  make,
} from './index.js'

const TestPayload = Schema.Struct({ body: Schema.String })
type TestPayload = typeof TestPayload.Type

const Toast = make(TestPayload)

type Message = typeof Toast.Message.Type
type Model = typeof Toast.Model.Type
type Entry = typeof Toast.Entry.Type

const makeSettledEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'test-entry-0',
  variant: 'Info',
  animation: Animation.init({ id: 'test-entry-0', isShowing: true }),
  maybeDuration: Option.some(Duration.seconds(4)),
  pendingDismissVersion: 0,
  isHovered: false,
  swipeState: SwipeState.Idle(),
  swipeVersion: 0,
  payload: { body: 'Hello' },
  ...overrides,
})

const defaultRenderEntry = (entry: Entry, _handlers: EntryHandlers) =>
  ih.div([], [ih.span([], [entry.payload.body])])

type ViewOverrides = {
  entryToView?: (entry: Entry, handlers: EntryHandlers) => Html
  ariaLabel?: string
  containerClassName?: string
  entryClassName?: string
}

const sceneView =
  (overrides: ViewOverrides = {}) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    Toast.view(
      model,
      {
        entryToView: defaultRenderEntry,
        position: 'BottomRight',
        ...overrides,
      },
      h,
    )

const container = Scene.selector('[key="test"]')
const entryZero = Scene.selector('[key="test-entry-0"]')

const STALE_VERSION = -1

const POINTER_ID = 0

const RELEASED_SWIPE_VERSION = 2

const withEntry = (overrides: Partial<Entry> = {}): Model =>
  evo(Toast.init({ id: 'test', swipeToDismiss: {} }), {
    entries: () => [makeSettledEntry(overrides)],
    nextEntryKey: () => 1,
  })

const withDisabledEntry = (overrides: Partial<Entry> = {}): Model =>
  evo(Toast.init({ id: 'test' }), {
    entries: () => [makeSettledEntry(overrides)],
    nextEntryKey: () => 1,
  })

describe('Toast', () => {
  describe('view', () => {
    it('renders the container with role=region and aria-live=polite', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(Toast.init({ id: 'test' })),
        Scene.expect(container).toExist(),
        Scene.expect(container).toHaveAttr('role', 'region'),
        Scene.expect(container).toHaveAttr('aria-live', 'polite'),
      )
    })

    it('renders the container even when empty, for a11y live-region setup', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(Toast.init({ id: 'test' })),
        Scene.expect(container).toExist(),
      )
    })

    it('renders an Info entry with role=status', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withEntry({ variant: 'Info' })),
        Scene.expect(entryZero).toExist(),
        Scene.expect(entryZero).toHaveAttr('role', 'status'),
      )
    })

    it('renders an Error entry with role=alert', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withEntry({ variant: 'Error' })),
        Scene.expect(entryZero).toHaveAttr('role', 'alert'),
      )
    })

    it('surfaces the entry variant via data-variant', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withEntry({ variant: 'Warning' })),
        Scene.expect(entryZero).toHaveAttr('data-variant', 'Warning'),
      )
    })

    it('reflects the enter transition via data attributes', () => {
      const enteringEntry: Entry = evo(makeSettledEntry(), {
        animation: () =>
          evo(Animation.init({ id: 'test-entry-0', isShowing: true }), {
            transitionState: () => 'EnterAnimating',
          }),
      })
      const model: Model = evo(Toast.init({ id: 'test' }), {
        entries: () => [enteringEntry],
        nextEntryKey: () => 1,
      })
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(model),
        Scene.expect(entryZero).toHaveAttr('data-enter', ''),
        Scene.expect(entryZero).toHaveAttr('data-transition', ''),
      )
    })

    it('reflects the leave transition via data attributes', () => {
      const leavingEntry: Entry = evo(makeSettledEntry(), {
        animation: () =>
          evo(Animation.init({ id: 'test-entry-0', isShowing: false }), {
            transitionState: () => 'LeaveAnimating',
          }),
      })
      const model: Model = evo(Toast.init({ id: 'test' }), {
        entries: () => [leavingEntry],
        nextEntryKey: () => 1,
      })
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(model),
        Scene.expect(entryZero).toHaveAttr('data-leave', ''),
        Scene.expect(entryZero).toHaveAttr('data-closed', ''),
      )
    })

    it('attaches mouse enter and leave handlers for pause-on-hover', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.expect(entryZero).toHaveHandler('mouseenter'),
        Scene.expect(entryZero).toHaveHandler('mouseleave'),
      )
    })

    it('uses a custom aria-label when provided', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView({ ariaLabel: 'Toasts' }) },
        Scene.given(Toast.init({ id: 'test' })),
        Scene.expect(container).toHaveAttr('aria-label', 'Toasts'),
      )
    })

    it('attaches pointerdown handler for swipe', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.expect(entryZero).toHaveHandler('pointerdown'),
      )
    })

    it('adds data-swipe=move and translate offset when dragging', () => {
      const model: Model = withEntry({
        swipeState: SwipeState.Dragging({
          pointerId: POINTER_ID,
          startX: 100,
          currentX: 180,
        }),
      })
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(model),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'move'),
        Scene.expect(entryZero).toHaveStyle('translate', '80px'),
        Scene.expect(entryZero).toHaveStyle('pointerEvents', 'auto'),
        Scene.expect(entryZero).toHaveStyle('touchAction', 'pan-y'),
        Scene.expect(entryZero).not.toHaveStyle('transform'),
      )
    })

    it('does not add data-swipe when idle', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
      )
    })

    it('attaches no pointerdown handler when swipe is disabled', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withDisabledEntry()),
        Scene.expect(entryZero).not.toHaveHandler('pointerdown'),
      )
    })

    it('does not restrict touch behavior when swipe is disabled', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withDisabledEntry()),
        Scene.expect(entryZero).not.toHaveStyle('touchAction'),
      )
    })

    it('allows vertical panning when swipe is enabled', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.expect(entryZero).toHaveStyle('touchAction', 'pan-y'),
      )
    })

    it('keeps the released offset rendered while the leave runs', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.pointerDown(entryZero, { clientX: 100 }),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'move'),
        Scene.Subscription.emit(
          Toast.Message.MovedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 200,
          }),
        ),
        Scene.expect(entryZero).toHaveStyle('translate', '100px'),
        Scene.Subscription.emit(
          Toast.Message.ReleasedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 200,
          }),
        ),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'settling'),
        Scene.expect(entryZero).toHaveStyle('translate', '100px'),
        Scene.expect(entryZero).not.toHaveStyle('transform'),
        Scene.expect(entryZero).toHaveAttr('data-leave', ''),
        Scene.Command.resolveAll(
          [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
          [
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation(),
          ],
        ),
        Scene.expect(entryZero).toBeAbsent(),
      )
    })

    it('renders settling without an offset after a cancelled release', () => {
      Scene.scene(
        { update: Toast.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.pointerDown(entryZero, { clientX: 100 }),
        Scene.Subscription.emit(
          Toast.Message.MovedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 130,
          }),
        ),
        Scene.Subscription.emit(
          Toast.Message.ReleasedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 130,
          }),
        ),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'settling'),
        Scene.expect(entryZero).not.toHaveStyle('translate'),
        Scene.expect(entryZero).not.toHaveAttr('data-leave'),
        Scene.Command.resolve(
          WaitForSwipeSettled,
          Toast.Message.CompletedWaitForSwipeSettled({
            entryId: 'test-entry-0',
            version: RELEASED_SWIPE_VERSION,
          }),
        ),
        Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
        Scene.Command.resolve(
          WaitBeforeDismissal,
          Toast.Message.CompletedWaitBeforeDismissal({
            entryId: 'test-entry-0',
            version: STALE_VERSION,
          }),
        ),
        Scene.expect(entryZero).toExist(),
      )
    })
  })

  describe('maps each variant to its ARIA role', () => {
    const cases: ReadonlyArray<readonly [Variant, string]> = [
      ['Info', 'status'],
      ['Success', 'status'],
      ['Warning', 'alert'],
      ['Error', 'alert'],
    ]
    cases.forEach(([variant, expectedRole]) => {
      it(`maps ${variant} to role=${expectedRole}`, () => {
        Scene.scene(
          { update: Toast.update, view: sceneView() },
          Scene.given(withEntry({ variant })),
          Scene.expect(entryZero).toHaveAttr('role', expectedRole),
        )
      })
    })
  })
})
