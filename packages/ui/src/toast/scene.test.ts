import { Duration, Option, Schema } from 'effect'
import { type Html, inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { type EntryHandlers, SwipeState, type Variant } from './toast.js'
import { makeFixture } from './toast.js'

const TestPayload = Schema.Struct({ body: Schema.String })
type TestPayload = typeof TestPayload.Type

const ToastFixture = makeFixture(TestPayload)
const toastTest = ToastFixture.test
const block = ToastFixture.block
const toastInit = ToastFixture.init

type Model = typeof block.Model.Type
type Entry = typeof ToastFixture.Entry.Type
type TestHtmlBuilder = Parameters<typeof ToastFixture.view>[2]

const ENTER_TRANSITION_GENERATION = 1
const LEAVE_TRANSITION_GENERATION = 2

const makeSettledEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'test-entry-0',
  variant: 'Info',
  animation: modifyFields(
    Animation.init({ id: 'test-entry-0', isShowing: true }).model,
    { transitionGeneration: () => ENTER_TRANSITION_GENERATION },
  ),
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
  (model: Model, h: TestHtmlBuilder) =>
    ToastFixture.view(
      model,
      {
        entryToView: defaultRenderEntry,
        position: 'BottomRight',
        ...overrides,
      },
      h,
    )

const container = Scene.selector('div[key="test"]')
const entryZero = Scene.selector('div[key="test-entry-0"]')

const STALE_VERSION = -1
const POINTER_ID = 0
const SETTLING_SWIPE_VERSION = 2

const withEntry = (overrides: Partial<Entry> = {}): Model =>
  modifyFields(toastInit({ id: 'test', swipeToDismiss: {} }).model, {
    entries: () => [makeSettledEntry(overrides)],
    nextEntryKey: () => 1,
  })

const withDisabledEntry = (overrides: Partial<Entry> = {}): Model =>
  modifyFields(toastInit({ id: 'test' }).model, {
    entries: () => [makeSettledEntry(overrides)],
    nextEntryKey: () => 1,
  })

describe('Toast', () => {
  describe('view', () => {
    it('renders the container with role=region and aria-live=polite', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(toastInit({ id: 'test' }).model),
        Scene.expect(container).toExist(),
        Scene.expect(container).toHaveAttr('role', 'region'),
        Scene.expect(container).toHaveAttr('aria-live', 'polite'),
      )
    })

    it('renders the container even when empty, for a11y live-region setup', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(toastInit({ id: 'test' }).model),
        Scene.expect(container).toExist(),
      )
    })

    it('renders an Info entry with role=status', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withEntry({ variant: 'Info' })),
        Scene.expect(entryZero).toExist(),
        Scene.expect(entryZero).toHaveAttr('role', 'status'),
      )
    })

    it('renders an Error entry with role=alert', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withEntry({ variant: 'Error' })),
        Scene.expect(entryZero).toHaveAttr('role', 'alert'),
      )
    })

    it('surfaces the entry variant via data-variant', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withEntry({ variant: 'Warning' })),
        Scene.expect(entryZero).toHaveAttr('data-variant', 'Warning'),
      )
    })

    it('reflects the enter transition via data attributes', () => {
      const enteringEntry: Entry = modifyFields(makeSettledEntry(), {
        animation: () =>
          modifyFields(
            Animation.init({ id: 'test-entry-0', isShowing: true }).model,
            {
              transitionState: () => 'EnterAnimating',
            },
          ),
      })
      const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
        entries: () => [enteringEntry],
        nextEntryKey: () => 1,
      })
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(model),
        Scene.expect(entryZero).toHaveAttr('data-enter', ''),
        Scene.expect(entryZero).toHaveAttr('data-transition', ''),
      )
    })

    it('reflects the leave transition via data attributes', () => {
      const leavingEntry: Entry = modifyFields(makeSettledEntry(), {
        animation: () =>
          modifyFields(
            Animation.init({ id: 'test-entry-0', isShowing: false }).model,
            {
              transitionState: () => 'LeaveAnimating',
            },
          ),
      })
      const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
        entries: () => [leavingEntry],
        nextEntryKey: () => 1,
      })
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(model),
        Scene.expect(entryZero).toHaveAttr('data-leave', ''),
        Scene.expect(entryZero).toHaveAttr('data-closed', ''),
      )
    })

    it('attaches mouse enter and leave handlers for pause-on-hover', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.expect(entryZero).toHaveHandler('mouseenter'),
        Scene.expect(entryZero).toHaveHandler('mouseleave'),
      )
    })

    it('dispatches dismiss from interactive entry content', () => {
      const view = (model: Model, h: TestHtmlBuilder) =>
        ToastFixture.view(
          model,
          {
            position: 'BottomRight',
            entryToView: (_entry, handlers) =>
              h.button(handlers.dismiss, ['Dismiss']),
          },
          h,
        )

      Scene.scene(
        { update: block.update, view },
        Scene.given(withEntry()),
        Scene.click(Scene.role('button', { name: 'Dismiss' })),
        Scene.expect(entryZero).toHaveAttr('data-leave', ''),
        Scene.Command.resolve(
          toastTest.matchWaitForPaint(
            'test-entry-0',
            LEAVE_TRANSITION_GENERATION,
          ),
          Animation.Message.CompletedWaitForPaint({
            generation: LEAVE_TRANSITION_GENERATION,
          }),
        ),
        Scene.Command.resolve(
          toastTest.matchWaitForAnimationSettled(
            'test-entry-0',
            LEAVE_TRANSITION_GENERATION,
          ),
          Animation.Message.EndedAnimation({
            generation: LEAVE_TRANSITION_GENERATION,
          }),
        ),
        Scene.expect(entryZero).toBeAbsent(),
      )
    })

    it('uses a custom aria-label when provided', () => {
      Scene.scene(
        { update: block.update, view: sceneView({ ariaLabel: 'Toasts' }) },
        Scene.given(toastInit({ id: 'test' }).model),
        Scene.expect(container).toHaveAttr('aria-label', 'Toasts'),
      )
    })

    it('attaches a pointerdown handler when swipe is enabled', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.expect(entryZero).toHaveHandler('pointerdown'),
      )
    })

    it('does not start a mouse swipe from controls or text marked to ignore swipes', () => {
      const view = (model: Model, h: TestHtmlBuilder) =>
        ToastFixture.view(
          model,
          {
            position: 'BottomRight',
            entryToView: () =>
              ih.div(
                [],
                [
                  ih.button([ih.AriaLabel('Close')], ['Close']),
                  ih.span(
                    [ih.DataAttribute('toast-swipe-ignore', '')],
                    ['Selectable'],
                  ),
                  ih.div([ih.DataAttribute('swipe-area', '')], ['Drag']),
                ],
              ),
          },
          h,
        )

      Scene.scene(
        { update: block.update, view },
        Scene.given(withEntry()),
        Scene.pointerDown(Scene.label('Close')),
        Scene.expectIgnored(),
        Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
        Scene.pointerDown(Scene.text('Selectable')),
        Scene.expectIgnored(),
        Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
        Scene.pointerDown(Scene.selector('[data-swipe-area]')),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'move'),
      )
    })

    it('renders drag translation separately from transform', () => {
      const model = withEntry({
        swipeState: SwipeState.Dragging({
          pointerId: POINTER_ID,
          startX: 100,
          currentX: 180,
        }),
      })
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(model),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'move'),
        Scene.expect(entryZero).toHaveStyle('translate', '80px'),
        Scene.expect(entryZero).toHaveStyle('pointerEvents', 'auto'),
        Scene.expect(entryZero).toHaveStyle('touchAction', 'pan-y'),
        Scene.expect(entryZero).not.toHaveStyle('transform'),
      )
    })

    it('omits data-swipe while idle', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
      )
    })

    it('attaches no pointerdown handler when swipe is disabled', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withDisabledEntry()),
        Scene.expect(entryZero).not.toHaveHandler('pointerdown'),
      )
    })

    it('does not restrict touch behavior when swipe is disabled', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withDisabledEntry()),
        Scene.expect(entryZero).not.toHaveStyle('touchAction'),
      )
    })

    it('allows vertical panning when swipe is enabled', () => {
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withEntry()),
        Scene.expect(entryZero).toHaveStyle('touchAction', 'pan-y'),
      )
    })

    it('holds the release offset until the leave animation starts', () => {
      Scene.scene(
        {
          update: block.update,
          view: sceneView(),
          subscriptions: block.subscriptions,
        },
        Scene.given(withEntry()),
        Scene.pointerDown(entryZero, { clientX: 100 }),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'move'),
        Scene.Subscription.emit(
          block.subscriptions.swipePointer,
          block.Message.MovedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 200,
          }),
        ),
        Scene.expect(entryZero).toHaveStyle('translate', '100px'),
        Scene.Subscription.emit(
          block.subscriptions.swipePointer,
          block.Message.ReleasedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 200,
          }),
        ),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'end'),
        Scene.expect(entryZero).toHaveStyle('translate', '100px'),
        Scene.expect(entryZero).not.toHaveStyle('transform'),
        Scene.expect(entryZero).toHaveAttr('data-leave', ''),
        Scene.Command.resolve(
          toastTest.matchWaitForPaint(
            'test-entry-0',
            LEAVE_TRANSITION_GENERATION,
          ),
          Animation.Message.CompletedWaitForPaint({
            generation: LEAVE_TRANSITION_GENERATION,
          }),
        ),
        Scene.expect(entryZero).toHaveStyle('translate', '100vw'),
        Scene.Command.resolve(
          toastTest.matchWaitForAnimationSettled(
            'test-entry-0',
            LEAVE_TRANSITION_GENERATION,
          ),
          Animation.Message.EndedAnimation({
            generation: LEAVE_TRANSITION_GENERATION,
          }),
        ),
        Scene.expect(entryZero).toBeAbsent(),
      )
    })

    it('returns a short swipe to zero while settling', () => {
      Scene.scene(
        {
          update: block.update,
          view: sceneView(),
          subscriptions: block.subscriptions,
        },
        Scene.given(withEntry()),
        Scene.pointerDown(entryZero, { clientX: 100 }),
        Scene.Subscription.emit(
          block.subscriptions.swipePointer,
          block.Message.MovedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 130,
          }),
        ),
        Scene.Subscription.emit(
          block.subscriptions.swipePointer,
          block.Message.ReleasedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 130,
          }),
        ),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'settling'),
        Scene.expect(entryZero).not.toHaveStyle('translate'),
        Scene.expect(entryZero).not.toHaveAttr('data-leave'),
        Scene.Command.resolve(
          ToastFixture.WaitForSwipeSettled,
          block.Message.CompletedWaitForSwipeSettled({
            entryId: 'test-entry-0',
            version: SETTLING_SWIPE_VERSION,
          }),
        ),
        Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
        Scene.Command.resolve(
          ToastFixture.WaitBeforeDismissal,
          block.Message.CompletedWaitBeforeDismissal({
            entryId: 'test-entry-0',
            version: STALE_VERSION,
          }),
        ),
        Scene.expect(entryZero).toExist(),
      )
    })

    it('continues a rightward dismissal off-screen after the leave starts', () => {
      const entry = makeSettledEntry({
        swipeState: SwipeState.Dismissing({ offsetX: 140, direction: 'Right' }),
        animation: {
          id: 'test-entry-0',
          isShowing: false,
          transitionState: 'LeaveAnimating',
          transitionGeneration: LEAVE_TRANSITION_GENERATION,
        },
      })
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withEntry(entry)),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'end'),
        Scene.expect(entryZero).toHaveStyle('translate', '100vw'),
      )
    })

    it('continues a leftward dismissal off-screen after the leave starts', () => {
      const entry = makeSettledEntry({
        swipeState: SwipeState.Dismissing({ offsetX: -140, direction: 'Left' }),
        animation: {
          id: 'test-entry-0',
          isShowing: false,
          transitionState: 'LeaveAnimating',
          transitionGeneration: LEAVE_TRANSITION_GENERATION,
        },
      })
      Scene.scene(
        { update: block.update, view: sceneView() },
        Scene.given(withEntry(entry)),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'end'),
        Scene.expect(entryZero).toHaveStyle('translate', '-100vw'),
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
          { update: block.update, view: sceneView() },
          Scene.given(withEntry({ variant })),
          Scene.expect(entryZero).toHaveAttr('role', expectedRole),
        )
      })
    })
  })
})
