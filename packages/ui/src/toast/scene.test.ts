import { Array, Duration, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import { inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { SwipeState, type Variant, makeBlock } from './toast.js'

const TestPayload = Schema.Struct({ body: Schema.String })
type TestPayload = typeof TestPayload.Type

const Toast = makeBlock(TestPayload)

type Model = Resolved<typeof Toast.Model.Type>
type Entry = Model['entries'][number]
type AnimationModel = Resolved<Animation.Model>
type EntryInput = (typeof Toast.Message.Added.Type)['entry']

const ENTER_TRANSITION_GENERATION = 1
const LEAVE_TRANSITION_GENERATION = 2

const animationInit = ({
  id,
  isShowing = false,
}: Readonly<{ id: string; isShowing?: boolean }>): Readonly<{
  model: AnimationModel
}> => ({
  model: { id, isShowing, transitionState: 'Idle', transitionGeneration: 0 },
})

const toastModel = (isSwipeEnabled: boolean): Model => ({
  id: 'test',
  defaultDuration: Duration.seconds(4),
  entries: [],
  nextEntryKey: 0,
  maybeSwipeConfig: isSwipeEnabled
    ? Option.some({ threshold: 40, direction: 'Right' })
    : Option.none(),
})

const makeSettledEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'test-entry-0',
  variant: 'Info',
  animation: modifyFields(
    animationInit({ id: 'test-entry-0', isShowing: true }).model,
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

const toEntryInput = (entry: Entry): EntryInput => ({
  id: entry.id,
  variant: entry.variant,
  maybeDuration: entry.maybeDuration,
  pendingDismissVersion: entry.pendingDismissVersion,
  isHovered: entry.isHovered,
  swipeState: entry.swipeState,
  swipeVersion: entry.swipeVersion,
  payload: entry.payload,
})

// SCENE

const EntryView = Schema.Literals(['Body', 'DismissButton', 'SwipeTargets'])
type EntryView = typeof EntryView.Type

type ToastSceneArgs = Readonly<{
  seed: ReadonlyArray<EntryInput>
  entryView: EntryView
  ariaLabel: string | undefined
}>

class ToastScene extends Block<ToastScene, ToastSceneArgs>()('ToastScene', {
  Model: Schema.Struct({ toast: Toast }),
  Message: defineMessageUnion({ ClickedSeed: {} }),
}) {}

const ToastSceneLive = ToastScene.make(
  Effect.fn(function* (_id, { seed, entryView, ariaLabel }) {
    const toast = yield* new Toast('toast', { id: 'test' })

    return {
      model: { toast },
      update: {
        ClickedSeed: model => ({
          model,
          messages: Array.map(seed, entry =>
            model.toast.send(Toast.Message.Added({ entry })),
          ),
        }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.button(
              [h.Id('toast-seed'), h.OnClick(ToastScene.Message.ClickedSeed())],
              ['Seed'],
            ),
            model.toast.view({
              position: 'BottomRight',
              ...(ariaLabel === undefined ? {} : { ariaLabel }),
              entryToView: (entry, handlers) => {
                if (entryView === 'DismissButton') {
                  return h.button(handlers.dismiss, ['Dismiss'])
                } else if (entryView === 'SwipeTargets') {
                  return ih.div(
                    [],
                    [
                      ih.button([ih.AriaLabel('Close')], ['Close']),
                      ih.span(
                        [ih.DataAttribute('toast-swipe-ignore', '')],
                        ['Selectable'],
                      ),
                      ih.div([ih.DataAttribute('swipe-area', '')], ['Drag']),
                    ],
                  )
                } else {
                  return ih.div([], [ih.span([], [entry.payload.body])])
                }
              },
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(Toast.Live))

const discardSeedCommands = <SimulationModel, SimulationMessage, OutMessage>(
  simulation: Scene.SceneSimulation<
    SimulationModel,
    SimulationMessage,
    OutMessage
  >,
): Scene.SceneSimulation<SimulationModel, SimulationMessage, OutMessage> => ({
  ...simulation,
  commands: Array.empty(),
})

const givenModel =
  (model: Model) =>
  <SimulationModel, SimulationMessage, OutMessage>(
    simulation: Scene.SceneSimulation<
      SimulationModel,
      SimulationMessage,
      OutMessage
    >,
  ) =>
    Scene.given({ toast: model })(
      discardSeedCommands(Scene.click('#toast-seed')(simulation)),
    )

const sceneArgs = (
  model: Model,
  entryView: EntryView = 'Body',
  ariaLabel?: string,
): ToastSceneArgs => ({
  seed: Array.map(model.entries, toEntryInput),
  entryView,
  ariaLabel,
})

const container = Scene.selector('div[key="test"]')
const entryZero = Scene.selector('div[key="test-entry-0"]')

const POINTER_ID = 0

const withEntry = (overrides: Partial<Entry> = {}): Model =>
  modifyFields(toastModel(true), {
    entries: () => [makeSettledEntry(overrides)],
    nextEntryKey: () => 1,
  })

const withDisabledEntry = (overrides: Partial<Entry> = {}): Model =>
  modifyFields(toastModel(false), {
    entries: () => [makeSettledEntry(overrides)],
    nextEntryKey: () => 1,
  })

describe('Toast', () => {
  describe('view', () => {
    it.effect(
      'renders the container with role=region and aria-live=polite',
      () =>
        Scene.scene(
          ToastSceneLive,
          sceneArgs(toastModel(false)),
          Scene.expect(container).toExist(),
          Scene.expect(container).toHaveAttr('role', 'region'),
          Scene.expect(container).toHaveAttr('aria-live', 'polite'),
        ),
    )

    it.effect(
      'renders the container even when empty, for a11y live-region setup',
      () =>
        Scene.scene(
          ToastSceneLive,
          sceneArgs(toastModel(false)),
          Scene.expect(container).toExist(),
        ),
    )

    it.effect('renders an Info entry with role=status', () => {
      const model = withEntry({ variant: 'Info' })
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).toExist(),
        Scene.expect(entryZero).toHaveAttr('role', 'status'),
      )
    })

    it.effect('renders an Error entry with role=alert', () => {
      const model = withEntry({ variant: 'Error' })
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).toHaveAttr('role', 'alert'),
      )
    })

    it.effect('surfaces the entry variant via data-variant', () => {
      const model = withEntry({ variant: 'Warning' })
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).toHaveAttr('data-variant', 'Warning'),
      )
    })

    it.effect('reflects the enter transition via data attributes', () => {
      const model = withEntry({
        animation: modifyFields(
          animationInit({ id: 'test-entry-0', isShowing: true }).model,
          { transitionState: () => 'EnterAnimating' },
        ),
      })
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).toHaveAttr('data-enter', ''),
        Scene.expect(entryZero).toHaveAttr('data-transition', ''),
      )
    })

    it.effect('reflects the leave transition via data attributes', () => {
      const model = withEntry({
        animation: modifyFields(
          animationInit({ id: 'test-entry-0', isShowing: false }).model,
          { transitionState: () => 'LeaveAnimating' },
        ),
      })
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).toHaveAttr('data-leave', ''),
        Scene.expect(entryZero).toHaveAttr('data-closed', ''),
      )
    })

    it.effect(
      'attaches mouse enter and leave handlers for pause-on-hover',
      () => {
        const model = withEntry()
        return Scene.scene(
          ToastSceneLive,
          sceneArgs(model),
          givenModel(model),
          Scene.expect(entryZero).toHaveHandler('mouseenter'),
          Scene.expect(entryZero).toHaveHandler('mouseleave'),
        )
      },
    )

    it.effect('dispatches dismiss from interactive entry content', () => {
      const model = withEntry()
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model, 'DismissButton'),
        givenModel(model),
        Scene.click(Scene.role('button', { name: 'Dismiss' })),
        Scene.expect(entryZero).toHaveAttr('data-leave', ''),
        Scene.Command.resolve(
          Animation.WaitForPaint({ generation: LEAVE_TRANSITION_GENERATION }),
          Animation.Message.CompletedWaitForPaint({
            generation: LEAVE_TRANSITION_GENERATION,
          }),
        ),
        Scene.Command.resolve(
          Animation.WaitForAnimationSettled({
            id: 'test-entry-0',
            generation: LEAVE_TRANSITION_GENERATION,
          }),
          Animation.Message.EndedAnimation({
            generation: LEAVE_TRANSITION_GENERATION,
          }),
        ),
        Scene.expect(entryZero).toBeAbsent(),
      )
    })

    it.effect('uses a custom aria-label when provided', () =>
      Scene.scene(
        ToastSceneLive,
        sceneArgs(toastModel(false), 'Body', 'Toasts'),
        Scene.expect(container).toHaveAttr('aria-label', 'Toasts'),
      ),
    )

    it.effect('attaches a pointerdown handler when swipe is enabled', () => {
      const model = withEntry()
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).toHaveHandler('pointerdown'),
      )
    })

    it.effect(
      'does not start a mouse swipe from controls or text marked to ignore swipes',
      () => {
        const model = withEntry()
        return Scene.scene(
          ToastSceneLive,
          sceneArgs(model, 'SwipeTargets'),
          givenModel(model),
          Scene.pointerDown(Scene.label('Close')),
          Scene.expectIgnored(),
          Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
          Scene.pointerDown(Scene.text('Selectable')),
          Scene.expectIgnored(),
          Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
          Scene.pointerDown(Scene.selector('[data-swipe-area]')),
          Scene.expect(entryZero).toHaveAttr('data-swipe', 'move'),
        )
      },
    )

    it.effect('renders drag translation separately from transform', () => {
      const model = withEntry({
        swipeState: SwipeState.Dragging({
          pointerId: POINTER_ID,
          startX: 100,
          currentX: 180,
        }),
      })
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'move'),
        Scene.expect(entryZero).toHaveStyle('translate', '80px'),
        Scene.expect(entryZero).toHaveStyle('pointerEvents', 'auto'),
        Scene.expect(entryZero).toHaveStyle('touchAction', 'pan-y'),
        Scene.expect(entryZero).not.toHaveStyle('transform'),
      )
    })

    it.effect('omits data-swipe while idle', () => {
      const model = withEntry()
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
      )
    })

    it.effect('attaches no pointerdown handler when swipe is disabled', () => {
      const model = withDisabledEntry()
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).not.toHaveHandler('pointerdown'),
      )
    })

    it.effect('does not restrict touch behavior when swipe is disabled', () => {
      const model = withDisabledEntry()
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).not.toHaveStyle('touchAction'),
      )
    })

    it.effect('allows vertical panning when swipe is enabled', () => {
      const model = withEntry()
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.expect(entryZero).toHaveStyle('touchAction', 'pan-y'),
      )
    })

    it.effect(
      'holds the release offset until the leave animation starts',
      () => {
        const model = withEntry()
        const dismissing = (
          transitionState: AnimationModel['transitionState'],
        ): Model =>
          withEntry({
            swipeState: SwipeState.Dismissing({
              offsetX: 100,
              direction: 'Right',
            }),
            swipeVersion: 2,
            pendingDismissVersion: 1,
            animation: {
              id: 'test-entry-0',
              isShowing: false,
              transitionState,
              transitionGeneration: LEAVE_TRANSITION_GENERATION,
            },
          })

        return Scene.scene(
          ToastSceneLive,
          sceneArgs(model),
          givenModel(model),
          Scene.pointerDown(entryZero, { clientX: 100 }),
          Scene.expect(entryZero).toHaveAttr('data-swipe', 'move'),
          Scene.given({
            toast: withEntry({
              swipeState: SwipeState.Dragging({
                pointerId: POINTER_ID,
                startX: 100,
                currentX: 200,
              }),
              swipeVersion: 1,
              pendingDismissVersion: 1,
            }),
          }),
          Scene.expect(entryZero).toHaveStyle('translate', '100px'),
          Scene.given({ toast: dismissing('LeaveStart') }),
          Scene.expect(entryZero).toHaveAttr('data-swipe', 'end'),
          Scene.expect(entryZero).toHaveStyle('translate', '100px'),
          Scene.expect(entryZero).not.toHaveStyle('transform'),
          Scene.expect(entryZero).toHaveAttr('data-leave', ''),
          Scene.given({ toast: dismissing('LeaveAnimating') }),
          Scene.expect(entryZero).toHaveStyle('translate', '100vw'),
        )
      },
    )

    it.effect('returns a short swipe to zero while settling', () => {
      const model = withEntry()
      return Scene.scene(
        ToastSceneLive,
        sceneArgs(model),
        givenModel(model),
        Scene.pointerDown(entryZero, { clientX: 100 }),
        Scene.given({
          toast: withEntry({
            swipeState: SwipeState.Settling({ offsetX: 0 }),
            swipeVersion: 2,
            pendingDismissVersion: 2,
          }),
        }),
        Scene.expect(entryZero).toHaveAttr('data-swipe', 'settling'),
        Scene.expect(entryZero).not.toHaveStyle('translate'),
        Scene.expect(entryZero).not.toHaveAttr('data-leave'),
        Scene.given({
          toast: withEntry({ swipeVersion: 2, pendingDismissVersion: 2 }),
        }),
        Scene.expect(entryZero).not.toHaveAttr('data-swipe'),
        Scene.expect(entryZero).toExist(),
      )
    })

    it.effect(
      'continues a rightward dismissal off-screen after the leave starts',
      () => {
        const model = withEntry({
          swipeState: SwipeState.Dismissing({
            offsetX: 140,
            direction: 'Right',
          }),
          animation: {
            id: 'test-entry-0',
            isShowing: false,
            transitionState: 'LeaveAnimating',
            transitionGeneration: LEAVE_TRANSITION_GENERATION,
          },
        })
        return Scene.scene(
          ToastSceneLive,
          sceneArgs(model),
          givenModel(model),
          Scene.expect(entryZero).toHaveAttr('data-swipe', 'end'),
          Scene.expect(entryZero).toHaveStyle('translate', '100vw'),
        )
      },
    )

    it.effect(
      'continues a leftward dismissal off-screen after the leave starts',
      () => {
        const model = withEntry({
          swipeState: SwipeState.Dismissing({
            offsetX: -140,
            direction: 'Left',
          }),
          animation: {
            id: 'test-entry-0',
            isShowing: false,
            transitionState: 'LeaveAnimating',
            transitionGeneration: LEAVE_TRANSITION_GENERATION,
          },
        })
        return Scene.scene(
          ToastSceneLive,
          sceneArgs(model),
          givenModel(model),
          Scene.expect(entryZero).toHaveAttr('data-swipe', 'end'),
          Scene.expect(entryZero).toHaveStyle('translate', '-100vw'),
        )
      },
    )
  })

  describe('maps each variant to its ARIA role', () => {
    const cases: ReadonlyArray<readonly [Variant, string]> = [
      ['Info', 'status'],
      ['Success', 'status'],
      ['Warning', 'alert'],
      ['Error', 'alert'],
    ]
    cases.forEach(([variant, expectedRole]) => {
      it.effect(`maps ${variant} to role=${expectedRole}`, () => {
        const model = withEntry({ variant })
        return Scene.scene(
          ToastSceneLive,
          sceneArgs(model),
          givenModel(model),
          Scene.expect(entryZero).toHaveAttr('role', expectedRole),
        )
      })
    })
  })
})
