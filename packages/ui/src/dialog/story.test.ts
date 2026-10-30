import {
  Array,
  Effect,
  Fiber,
  Layer,
  Option,
  Predicate,
  Schema,
  Stream,
} from 'effect'
import { Block, Command } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import { DEVTOOLS_HOST_ID } from 'foldkit/devtools-host'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import {
  AcquireResources,
  CloseDialog,
  Dialog,
  DialogLive,
  type InitConfig,
  Message,
  type Model,
  OutMessage,
  ReleaseDialogResources,
  type RenderInfo,
  ShowDialog,
  commandHandlers,
  descriptionId,
  initialFocusMarkerAttribute,
  initialFocusMarkerSelector,
  mountHandlers,
  titleId,
} from './block.js'

type DialogModel = Resolved<Model>

const EffectsLayer = Layer.mergeAll(
  ShowDialog.toLayer(Effect.succeed(commandHandlers.ShowDialog)),
  CloseDialog.toLayer(Effect.succeed(commandHandlers.CloseDialog)),
  ReleaseDialogResources.toLayer(
    Effect.succeed(commandHandlers.ReleaseDialogResources),
  ),
  AcquireResources.toLayer(Effect.succeed(mountHandlers.AcquireResources)),
)

const provideEffects = Effect.provide(EffectsLayer)

const acknowledgeAcquireResources = Scene.Mount.resolve(
  AcquireResources,
  Message.SucceededAcquireResources(),
)

const closedModel = ({
  id,
  isAnimated = false,
  focusSelector,
}: InitConfig): DialogModel => ({
  id,
  isOpen: false,
  isAnimated,
  animation: {
    id: `${id}-panel`,
    isShowing: false,
    transitionState: 'Idle',
    transitionGeneration: 0,
  },
  maybeFocusSelector: Option.fromNullishOr(focusSelector),
})

const openModel = (config: InitConfig): DialogModel => {
  const closed = closedModel(config)

  if (closed.isAnimated) {
    return modifyFields(closed, {
      isOpen: () => true,
      animation: animation =>
        modifyFields(animation, {
          isShowing: () => true,
          transitionState: () => 'EnterStart',
          transitionGeneration: () => 1,
        }),
    })
  } else {
    return modifyFields(closed, { isOpen: () => true })
  }
}

const leavingModel = (
  config: InitConfig,
  transitionState: 'LeaveStart' | 'LeaveAnimating',
  transitionGeneration = 0,
): DialogModel =>
  modifyFields(openModel(config), {
    isOpen: () => false,
    animation: animation =>
      modifyFields(animation, {
        isShowing: () => false,
        transitionState: () => transitionState,
        transitionGeneration: () => transitionGeneration,
      }),
  })

const enteringModel = (config: InitConfig): DialogModel =>
  modifyFields(openModel(config), {
    animation: animation =>
      modifyFields(animation, {
        transitionState: () => 'EnterAnimating',
        transitionGeneration: () => 1,
      }),
  })

const configOf = (model: DialogModel): InitConfig => ({
  id: model.id,
  isAnimated: model.isAnimated,
})

// PARENT

const DialogEvent = Schema.Literals(['Opened', 'Closed'])
type DialogEvent = typeof DialogEvent.Type

const ParentMessage = defineMessageUnion({
  ClickedOpenDialog: {},
  CompletedLoadParentData: {},
})

const LoadParentData = Command.define('LoadParentData', {
  messages: [ParentMessage.CompletedLoadParentData],
})

class DialogParent extends Block<DialogParent>()('DialogParent', {
  Model: Schema.Struct({
    dialog: Dialog,
    dialogEvents: Schema.Array(DialogEvent),
  }),
  Message: ParentMessage,
  Command: [LoadParentData],
}) {}

const DialogParentLive = DialogParent.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog('dialog', { id: 'initial-dialog' })

    return {
      model: { dialog, dialogEvents: [] },
      update: {
        ClickedOpenDialog: model => ({
          model,
          commands: [LoadParentData()],
          messages: [model.dialog.send(Dialog.Message.RequestedOpen())],
        }),
        CompletedLoadParentData: model => ({ model }),
        ...dialog.on({
          Opened: model => ({
            model: modifyFields(model, {
              dialogEvents: Array.append(DialogEvent.make('Opened')),
            }),
          }),
          Closed: model => ({
            model: modifyFields(model, {
              dialogEvents: Array.append(DialogEvent.make('Closed')),
            }),
          }),
        }),
      },
      commands: {
        LoadParentData: () =>
          Effect.succeed(DialogParent.Message.CompletedLoadParentData()),
      },
    }
  }),
).pipe(Layer.provide(DialogLive))

// SCENE

type DialogSceneArgs = Readonly<{
  dialog: InitConfig
  hasDescription: boolean
  onRender: (render: RenderInfo) => void
}>

class DialogScene extends Block<DialogScene, DialogSceneArgs>()('DialogScene', {
  Model: Schema.Struct({ dialog: Dialog, isDialogRendered: Schema.Boolean }),
}) {}

const DialogSceneLive = DialogScene.make(
  Effect.fn(function* (_id, { dialog: config, hasDescription, onRender }) {
    const dialog = yield* new Dialog('dialog', config)

    return {
      model: { dialog, isDialogRendered: false },
      view: (model, h) =>
        model.isDialogRendered
          ? model.dialog.view({
              hasDescription,
              toView: render => {
                onRender(render)
                return h.dialog([...render.dialog])
              },
            })
          : h.div([]),
    }
  }),
).pipe(Layer.provide(DialogLive))

const renderDialog = (model: DialogModel) =>
  Scene.given({ dialog: model, isDialogRendered: true })

const isDialogVisible = (model: DialogModel): boolean =>
  model.isOpen || model.animation.transitionState !== 'Idle'

const isOnUnmount = <RequiredMountRequirements>(
  childAttribute: ChildAttribute<RequiredMountRequirements>,
): boolean => Predicate.isTagged(childAttribute.attribute, 'OnUnmount')

const sceneArgs = (
  model: DialogModel,
  onRender: (render: RenderInfo) => void,
  hasDescription = false,
): DialogSceneArgs => ({ dialog: configOf(model), hasDescription, onRender })

const dialogHasOnUnmount = (model: DialogModel) =>
  Effect.gen(function* () {
    let hasOnUnmount = false
    const args = sceneArgs(model, ({ dialog }) => {
      hasOnUnmount = dialog.some(isOnUnmount)
    })

    if (isDialogVisible(model)) {
      yield* Scene.scene(
        DialogSceneLive,
        args,
        renderDialog(model),
        acknowledgeAcquireResources,
      )
    } else {
      yield* Scene.scene(DialogSceneLive, args, renderDialog(model))
    }

    return hasOnUnmount
  })

const renderGroup = <RequiredMountRequirements>(
  model: DialogModel,
  selectGroup: (
    render: RenderInfo,
  ) => ReadonlyArray<ChildAttribute<RequiredMountRequirements>>,
  hasDescription = false,
) =>
  Effect.gen(function* () {
    let captured: ReadonlyArray<ChildAttribute<RequiredMountRequirements>> = []
    const args = sceneArgs(
      model,
      render => {
        captured = selectGroup(render)
      },
      hasDescription,
    )

    if (isDialogVisible(model)) {
      if (model.animation.transitionState === 'LeaveStart') {
        yield* Scene.scene(
          DialogSceneLive,
          args,
          renderDialog(model),
          acknowledgeAcquireResources,
          Scene.Command.resolve(
            Animation.WaitForPaint,
            Animation.Message.CompletedWaitForPaint({
              generation: model.animation.transitionGeneration,
            }),
          ),
          Scene.Command.resolve(
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation({
              generation: model.animation.transitionGeneration,
            }),
          ),
          Scene.Command.resolve(CloseDialog, Message.CompletedCloseDialog()),
        )
      } else {
        yield* Scene.scene(
          DialogSceneLive,
          args,
          renderDialog(model),
          acknowledgeAcquireResources,
        )
      }
    } else {
      yield* Scene.scene(DialogSceneLive, args, renderDialog(model))
    }

    return captured
  })

const hasIdAttribute = <RequiredMountRequirements>(
  group: ReadonlyArray<ChildAttribute<RequiredMountRequirements>>,
  id: string,
): boolean =>
  group.some(
    ({ attribute }) =>
      Predicate.isTagged(attribute, 'Id') &&
      Predicate.hasProperty(attribute, 'value') &&
      attribute.value === id,
  )

const hasDataAttribute = <RequiredMountRequirements>(
  group: ReadonlyArray<ChildAttribute<RequiredMountRequirements>>,
  key: string,
): boolean =>
  group.some(
    ({ attribute }) =>
      Predicate.isTagged(attribute, 'DataAttribute') &&
      Predicate.hasProperty(attribute, 'key') &&
      attribute.key === key,
  )

const hasButtonType = <RequiredMountRequirements>(
  group: ReadonlyArray<ChildAttribute<RequiredMountRequirements>>,
): boolean =>
  group.some(
    ({ attribute }) =>
      Predicate.isTagged(attribute, 'Type') &&
      Predicate.hasProperty(attribute, 'value') &&
      attribute.value === 'button',
  )

const hasAriaDescribedBy = <RequiredMountRequirements>(
  group: ReadonlyArray<ChildAttribute<RequiredMountRequirements>>,
  id: string,
): boolean =>
  group.some(
    ({ attribute }) =>
      Predicate.isTagged(attribute, 'AriaDescribedBy') &&
      Predicate.hasProperty(attribute, 'value') &&
      attribute.value === id,
  )

const hasCancelPrevention = <RequiredMountRequirements>(
  group: ReadonlyArray<ChildAttribute<RequiredMountRequirements>>,
): boolean =>
  group.some(({ attribute }) =>
    Predicate.isTagged(attribute, 'OnCancelPreventDefault'),
  )

const hasEscapeCancelMapping = <RequiredMountRequirements>(
  group: ReadonlyArray<ChildAttribute<RequiredMountRequirements>>,
): boolean =>
  group.some(
    ({ attribute }) =>
      Predicate.isTagged(attribute, 'OnCancelPreventDefault') &&
      Predicate.hasProperty(attribute, 'maybeCustomEventMessage') &&
      Predicate.isTagged(attribute.maybeCustomEventMessage, 'Some'),
  )

const test = { id: 'test' }
const animatedTest = { id: 'test', isAnimated: true }

describe('Dialog', () => {
  describe('constructor', () => {
    it.effect('defaults isOpen to false', () =>
      Story.story(
        DialogLive,
        test,
        Story.model(model => {
          expect(model).toStrictEqual(closedModel(test))
        }),
      ),
    )

    it.effect(
      'opens through the update path with the ShowDialog Command and Opened OutMessage',
      () =>
        Story.story(
          DialogLive,
          test,
          Story.message(Message.RequestedOpen()),
          Story.model(model => {
            expect(model).toStrictEqual(openModel(test))
          }),
          Story.Command.expectExact(
            ShowDialog({
              id: 'test',
              focusSelector: initialFocusMarkerSelector,
            }),
          ),
          Story.expectOutMessage(OutMessage.Opened()),
          Story.Command.resolve(ShowDialog, Message.SucceededShowDialog()),
        ),
    )

    it.effect(
      'opens from a parent while preserving parent Commands and handling Opened',
      () =>
        Story.story(
          DialogParentLive,
          Story.message(DialogParent.Message.ClickedOpenDialog()),
          Story.model(model => {
            expect(model.dialog.isOpen).toBe(true)
            expect(model.dialogEvents).toStrictEqual(['Opened'])
          }),
          (simulation: Story.StorySimulation<unknown, unknown, unknown>) => {
            expect(
              simulation.commands.map(({ name, args }) => ({ name, args })),
            ).toStrictEqual([
              { name: 'LoadParentData', args: undefined },
              {
                name: 'ShowDialog',
                args: {
                  id: 'initial-dialog',
                  focusSelector: initialFocusMarkerSelector,
                },
              },
            ])
            return simulation
          },
          Story.Command.resolveAll(
            [LoadParentData, DialogParent.Message.CompletedLoadParentData()],
            [ShowDialog, Message.SucceededShowDialog()],
          ),
        ),
    )

    it.effect('accepts a focusSelector', () =>
      Story.story(
        DialogLive,
        { id: 'test', focusSelector: '#search-input' },
        Story.model(model => {
          expect(model).toStrictEqual(
            closedModel({ id: 'test', focusSelector: '#search-input' }),
          )
        }),
      ),
    )
  })

  describe('update', () => {
    describe('non-animated', () => {
      it.effect('opens when closed on RequestedOpen and emits Opened', () =>
        Story.story(
          DialogLive,
          test,
          Story.message(Message.RequestedOpen()),
          Story.expectOutMessage(OutMessage.Opened()),
          Story.Command.resolve(ShowDialog, Message.SucceededShowDialog()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )

      it.effect(
        'shows with the initialFocus marker selector when no focusSelector is configured',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.message(Message.RequestedOpen()),
            Story.Command.resolve(
              ShowDialog({
                id: 'test',
                focusSelector: initialFocusMarkerSelector,
              }),
              Message.SucceededShowDialog(),
            ),
          ),
      )

      it.effect(
        'shows with the configured focusSelector, which wins over the marker',
        () =>
          Story.story(
            DialogLive,
            { id: 'test', focusSelector: '#search-input' },
            Story.message(Message.RequestedOpen()),
            Story.Command.resolve(
              ShowDialog({ id: 'test', focusSelector: '#search-input' }),
              Message.SucceededShowDialog(),
            ),
          ),
      )

      it.effect(
        'opens without command or OutMessage when already open on RequestedOpen',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.given(openModel(test)),
            Story.message(Message.RequestedOpen()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
            }),
          ),
      )

      it.effect('closes when open on RequestedClose and emits Closed', () =>
        Story.story(
          DialogLive,
          test,
          Story.given(openModel(test)),
          Story.message(Message.RequestedClose()),
          Story.expectOutMessage(OutMessage.Closed()),
          Story.Command.resolve(CloseDialog, Message.CompletedCloseDialog()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
      )

      it.effect(
        'closes without command or OutMessage when already closed on RequestedClose',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.message(Message.RequestedClose()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect(
        'returns model unchanged on SucceededShowDialog while open',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.given(openModel(test)),
            Story.message(Message.SucceededShowDialog()),
            Story.model(model => {
              expect(model).toStrictEqual(openModel(test))
            }),
            Story.Command.expectNone(),
          ),
      )

      it.effect(
        'dispatches CloseDialog when the show succeeds after the dialog closed',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.message(Message.SucceededShowDialog()),
            Story.expectNoOutMessage(),
            Story.Command.resolve(CloseDialog, Message.CompletedCloseDialog()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect(
        'dispatches CloseDialog when Mount acquisition succeeds after the dialog closed',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.message(Message.SucceededAcquireResources()),
            Story.expectNoOutMessage(),
            Story.Command.resolve(CloseDialog, Message.CompletedCloseDialog()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect(
        'closes the model when Mount acquisition fails while open',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.given(openModel(test)),
            Story.message(Message.FailedAcquireResources()),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
            Story.Command.expectNone(),
          ),
      )

      it.effect(
        'immediately resets an entering animation when Mount acquisition fails',
        () =>
          Story.story(
            DialogLive,
            animatedTest,
            Story.given(enteringModel(animatedTest)),
            Story.message(Message.FailedAcquireResources()),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.isShowing).toBe(false)
              expect(model.animation.transitionState).toBe('Idle')
              expect(model.animation.transitionGeneration).toBe(1)
            }),
            Story.Command.expectNone(),
          ),
      )
    })

    describe('animated', () => {
      it.effect('opens with enter animation on RequestedOpen', () =>
        Story.story(
          DialogLive,
          animatedTest,
          Story.message(Message.RequestedOpen()),
          Story.Command.expectHas(ShowDialog, Animation.WaitForPaint),
          Story.Command.resolveAll(
            [ShowDialog, Message.SucceededShowDialog()],
            [
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({ generation: 1 }),
            ],
            [
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation({ generation: 1 }),
            ],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.animation.transitionState).toBe('Idle')
          }),
        ),
      )

      it.effect(
        'closes with leave animation and CloseDialog on RequestedClose',
        () =>
          Story.story(
            DialogLive,
            animatedTest,
            Story.given(openModel(animatedTest)),
            Story.message(Message.RequestedClose()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.Message.EndedAnimation({ generation: 2 }),
              ],
              [CloseDialog, Message.CompletedCloseDialog()],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
      )

      it.effect('resumes EnterStart after lifecycle acquisition', () =>
        Story.story(
          DialogLive,
          animatedTest,
          Story.given(openModel(animatedTest)),
          Story.message(Message.SucceededAcquireResources()),
          Story.Command.expectHas(Animation.WaitForPaint({ generation: 1 })),
          Story.Command.resolveAll(
            [
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({ generation: 1 }),
            ],
            [
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation({ generation: 1 }),
            ],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.animation.transitionState).toBe('Idle')
          }),
        ),
      )

      it.effect('resumes EnterAnimating after lifecycle acquisition', () =>
        Story.story(
          DialogLive,
          animatedTest,
          Story.given(enteringModel(animatedTest)),
          Story.message(Message.SucceededAcquireResources()),
          Story.Command.expectHas(
            Animation.WaitForAnimationSettled({
              id: 'test-panel',
              generation: 1,
            }),
          ),
          Story.Command.resolve(
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation({ generation: 1 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.animation.transitionState).toBe('Idle')
          }),
        ),
      )

      it.effect('resumes LeaveStart after lifecycle acquisition', () =>
        Story.story(
          DialogLive,
          animatedTest,
          Story.given(leavingModel(animatedTest, 'LeaveStart', 2)),
          Story.message(Message.SucceededAcquireResources()),
          Story.Command.expectHas(Animation.WaitForPaint({ generation: 2 })),
          Story.Command.resolveAll(
            [
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({ generation: 2 }),
            ],
            [
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation({ generation: 2 }),
            ],
            [CloseDialog, Message.CompletedCloseDialog()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.transitionState).toBe('Idle')
          }),
        ),
      )

      it.effect('resumes LeaveAnimating after lifecycle acquisition', () =>
        Story.story(
          DialogLive,
          animatedTest,
          Story.given(leavingModel(animatedTest, 'LeaveAnimating', 2)),
          Story.message(Message.SucceededAcquireResources()),
          Story.Command.expectHas(
            Animation.WaitForAnimationSettled({
              id: 'test-panel',
              generation: 2,
            }),
          ),
          Story.Command.resolveAll(
            [
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation({ generation: 2 }),
            ],
            [CloseDialog, Message.CompletedCloseDialog()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.transitionState).toBe('Idle')
          }),
        ),
      )

      it.effect('ignores RequestedClose when already in LeaveStart', () => {
        const leaving = leavingModel(animatedTest, 'LeaveStart')

        return Story.story(
          DialogLive,
          animatedTest,
          Story.given(leaving),
          Story.message(Message.RequestedClose()),
          Story.model(model => {
            expect(model).toStrictEqual(leaving)
          }),
          Story.Command.expectNone(),
        )
      })

      it.effect(
        'dispatches no CloseDialog when the show succeeds during the leave animation',
        () => {
          const leaving = leavingModel(animatedTest, 'LeaveStart')

          return Story.story(
            DialogLive,
            animatedTest,
            Story.given(leaving),
            Story.message(Message.SucceededShowDialog()),
            Story.model(model => {
              expect(model).toStrictEqual(leaving)
            }),
            Story.Command.expectNone(),
          )
        },
      )

      it.effect('ignores RequestedClose when already in LeaveAnimating', () => {
        const leaving = leavingModel(animatedTest, 'LeaveAnimating')

        return Story.story(
          DialogLive,
          animatedTest,
          Story.given(leaving),
          Story.message(Message.RequestedClose()),
          Story.model(model => {
            expect(model).toStrictEqual(leaving)
          }),
          Story.Command.expectNone(),
        )
      })
    })

    describe('Unmounted', () => {
      it.effect(
        'resets the model to closed and releases resources without emitting Closed',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.given(openModel(test)),
            Story.message(Message.Unmounted()),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
            Story.Command.resolve(
              ReleaseDialogResources,
              Message.CompletedReleaseDialogResources(),
            ),
          ),
      )

      it.effect(
        'resets an in-flight leave animation to Idle without emitting Closed',
        () =>
          Story.story(
            DialogLive,
            animatedTest,
            Story.given(leavingModel(animatedTest, 'LeaveAnimating', 2)),
            Story.message(Message.Unmounted()),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.isShowing).toBe(false)
              expect(model.animation.transitionState).toBe('Idle')
              expect(model.animation.transitionGeneration).toBe(2)
            }),
            Story.Command.resolve(
              ReleaseDialogResources,
              Message.CompletedReleaseDialogResources(),
            ),
          ),
      )

      it.effect('is a no-op when the dialog is already closed', () =>
        Story.story(
          DialogLive,
          test,
          Story.message(Message.Unmounted()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model).toStrictEqual(closedModel(test))
          }),
          Story.Command.expectNone(),
        ),
      )

      it.effect(
        'returns the model unchanged on CompletedReleaseDialogResources',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.message(Message.CompletedReleaseDialogResources()),
            Story.model(model => {
              expect(model).toStrictEqual(closedModel(test))
            }),
          ),
      )
    })

    describe('FailedShowDialog', () => {
      it.effect(
        'closes the model without emitting Closed or releasing resources',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.given(openModel(test)),
            Story.message(Message.FailedShowDialog()),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
            Story.Command.expectNone(),
          ),
      )

      it.effect('resets a running enter animation to Idle', () =>
        Story.story(
          DialogLive,
          animatedTest,
          Story.given(enteringModel(animatedTest)),
          Story.message(Message.FailedShowDialog()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.isShowing).toBe(false)
            expect(model.animation.transitionState).toBe('Idle')
            expect(model.animation.transitionGeneration).toBe(1)
          }),
          Story.Command.expectNone(),
        ),
      )

      it.effect('resets a running leave animation to Idle', () =>
        Story.story(
          DialogLive,
          animatedTest,
          Story.given(leavingModel(animatedTest, 'LeaveAnimating')),
          Story.message(Message.FailedShowDialog()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.isShowing).toBe(false)
            expect(model.animation.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        ),
      )

      it.effect('does nothing when the dialog is already closed', () =>
        Story.story(
          DialogLive,
          test,
          Story.message(Message.FailedShowDialog()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model).toStrictEqual(closedModel(test))
          }),
          Story.Command.expectNone(),
        ),
      )

      it.effect(
        'dispatches no CloseDialog when the dialog is closed after a failed show',
        () =>
          Story.story(
            DialogLive,
            test,
            Story.given(openModel(test)),
            Story.message(Message.FailedShowDialog()),
            Story.message(Message.RequestedClose()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
          ),
      )
    })
  })

  describe('titleId', () => {
    it('returns the id suffixed with -dialog-title', () => {
      expect(titleId(closedModel({ id: 'my-dialog' }))).toBe(
        'my-dialog-dialog-title',
      )
    })
  })

  describe('descriptionId', () => {
    it('returns the id suffixed with -dialog-description', () => {
      expect(descriptionId(closedModel({ id: 'my-dialog' }))).toBe(
        'my-dialog-dialog-description',
      )
    })
  })

  describe('RenderInfo title and description', () => {
    it.effect('publishes the title id the dialog labels itself by', () =>
      Effect.gen(function* () {
        const model = closedModel({ id: 'my-dialog' })
        const group = yield* renderGroup(model, render => render.title)
        expect(hasIdAttribute(group, titleId(model))).toBe(true)
      }),
    )

    it.effect(
      'publishes the description id the dialog describes itself by',
      () =>
        Effect.gen(function* () {
          const model = closedModel({ id: 'my-dialog' })
          const group = yield* renderGroup(model, render => render.description)
          expect(hasIdAttribute(group, descriptionId(model))).toBe(true)
        }),
    )
  })

  describe('RenderInfo dialog', () => {
    it.effect('omits aria-describedby by default', () =>
      Effect.gen(function* () {
        const group = yield* renderGroup(
          closedModel({ id: 'my-dialog' }),
          render => render.dialog,
        )
        expect(hasAriaDescribedBy(group, 'my-dialog-dialog-description')).toBe(
          false,
        )
      }),
    )

    it.effect('references the description when opted in', () =>
      Effect.gen(function* () {
        const group = yield* renderGroup(
          closedModel({ id: 'my-dialog' }),
          render => render.dialog,
          true,
        )
        expect(hasAriaDescribedBy(group, 'my-dialog-dialog-description')).toBe(
          true,
        )
      }),
    )

    it.effect('suppresses native cancel events', () =>
      Effect.gen(function* () {
        const group = yield* renderGroup(
          closedModel({ id: 'my-dialog' }),
          render => render.dialog,
        )
        expect(hasCancelPrevention(group)).toBe(true)
      }),
    )

    it.effect('maps the showDialog Escape signal', () =>
      Effect.gen(function* () {
        const group = yield* renderGroup(
          closedModel({ id: 'my-dialog' }),
          render => render.dialog,
        )
        expect(hasEscapeCancelMapping(group)).toBe(true)
      }),
    )
  })

  describe('RenderInfo closeButton', () => {
    it.effect(
      'publishes type button so a close control does not submit a form',
      () =>
        Effect.gen(function* () {
          const group = yield* renderGroup(
            openModel({ id: 'my-dialog' }),
            render => render.closeButton,
          )
          expect(hasButtonType(group)).toBe(true)
        }),
    )

    it.effect('publishes type button while the leave animation runs', () =>
      Effect.gen(function* () {
        const group = yield* renderGroup(
          leavingModel({ id: 'my-dialog', isAnimated: true }, 'LeaveStart', 2),
          render => render.closeButton,
        )
        expect(hasButtonType(group)).toBe(true)
      }),
    )
  })

  describe('RenderInfo initialFocus', () => {
    it.effect('publishes the marker the dialog focuses on open', () =>
      Effect.gen(function* () {
        const group = yield* renderGroup(
          closedModel({ id: 'my-dialog' }),
          render => render.initialFocus,
        )
        expect(hasDataAttribute(group, initialFocusMarkerAttribute)).toBe(true)
      }),
    )

    it.effect(
      'focuses the element carrying the marker when the dialog opens',
      () =>
        Effect.gen(function* () {
          const dialog = document.createElement('dialog')
          dialog.id = 'focus-dialog'
          const before = document.createElement('input')
          const marked = document.createElement('input')
          marked.setAttribute(`data-${initialFocusMarkerAttribute}`, '')
          dialog.append(before, marked)
          document.body.appendChild(dialog)

          yield* Dom.showDialog('#focus-dialog', {
            focusSelector: initialFocusMarkerSelector,
          })

          expect(document.activeElement).toBe(marked)

          yield* Dom.closeDialog('#focus-dialog')
          document.body.innerHTML = ''
        }),
    )
  })

  describe('Command resource cleanup', () => {
    it.effect(
      'ShowDialog reports FailedShowDialog and releases the scroll lock when the dialog is gone before it shows',
      () =>
        Effect.gen(function* () {
          const showDialog = yield* ShowDialog({
            id: 'missing-dialog',
            focusSelector: initialFocusMarkerSelector,
          }).effect.pipe(provideEffects)

          expect(showDialog).toEqual(Message.FailedShowDialog())
          expect(document.documentElement.style.overflow).not.toBe('hidden')
        }),
    )

    it.effect(
      'ShowDialog keeps scroll unlocked when it is interrupted before the dialog shows',
      () =>
        Effect.gen(function* () {
          const showDialog = yield* Effect.forkChild(
            ShowDialog({
              id: 'missing-dialog',
              focusSelector: initialFocusMarkerSelector,
            }).effect.pipe(provideEffects),
          )

          yield* Effect.yieldNow
          expect(document.documentElement.style.overflow).not.toBe('hidden')

          yield* Fiber.interrupt(showDialog)

          expect(document.documentElement.style.overflow).not.toBe('hidden')
        }),
    )

    it.effect(
      'isolates the page while open and restores it before return focus',
      () => {
        const background = document.createElement('main')
        const trigger = document.createElement('button')
        background.appendChild(trigger)

        const dialog = document.createElement('dialog')
        dialog.id = 'modal-dialog'
        dialog.appendChild(document.createElement('button'))

        const devToolsHost = document.createElement('div')
        devToolsHost.id = DEVTOOLS_HOST_ID

        document.body.append(background, dialog, devToolsHost)
        trigger.focus()

        return Effect.gen(function* () {
          const showDialog = yield* ShowDialog({
            id: 'modal-dialog',
            focusSelector: initialFocusMarkerSelector,
          }).effect.pipe(provideEffects)

          expect(showDialog).toEqual(Message.SucceededShowDialog())
          expect(background.inert).toBe(true)
          expect(background.getAttribute('aria-hidden')).toBe('true')
          expect(devToolsHost.inert).toBe(false)

          yield* CloseDialog({ id: 'modal-dialog' }).effect.pipe(provideEffects)

          expect(background.inert).toBe(false)
          expect(background.hasAttribute('aria-hidden')).toBe(false)
          expect(document.activeElement).toBe(trigger)
        }).pipe(
          Effect.ensuring(
            Dom.releaseDialogResources('modal-dialog').pipe(
              Effect.andThen(
                Effect.sync(() => {
                  background.remove()
                  dialog.remove()
                  devToolsHost.remove()
                }),
              ),
            ),
          ),
        )
      },
    )

    it.effect(
      'keeps Command-owned resources when a concurrent Mount ends',
      () => {
        const background = document.createElement('main')
        const dialog = document.createElement('dialog')
        dialog.id = 'command-owned-dialog'
        document.body.append(background, dialog)

        return Effect.gen(function* () {
          const showDialog = yield* ShowDialog({
            id: 'command-owned-dialog',
            focusSelector: initialFocusMarkerSelector,
          }).effect.pipe(provideEffects)

          const mount = AcquireResources({
            id: 'command-owned-dialog',
            focusSelector: initialFocusMarkerSelector,
          })
          const mountMessage = yield* Stream.runHead(
            mount.f(dialog, Stream.make('Live')),
          ).pipe(provideEffects)

          expect(showDialog).toEqual(Message.SucceededShowDialog())
          expect(mountMessage).toEqual(
            Option.some(Message.SucceededAcquireResources()),
          )
          expect(background.inert).toBe(true)
          expect(document.documentElement.style.overflow).toBe('hidden')
        }).pipe(
          Effect.ensuring(
            Dom.releaseDialogResources('command-owned-dialog').pipe(
              Effect.andThen(
                Effect.sync(() => {
                  background.remove()
                  dialog.remove()
                }),
              ),
            ),
          ),
        )
      },
    )

    it.effect(
      'CloseDialog releases the dialog resources when the dialog is gone before it closes',
      () => {
        const dialog = document.createElement('dialog')
        dialog.id = 'vanishing-dialog'
        document.body.appendChild(dialog)

        return Effect.gen(function* () {
          const showDialog = yield* ShowDialog({
            id: 'vanishing-dialog',
            focusSelector: initialFocusMarkerSelector,
          }).effect.pipe(provideEffects)

          expect(showDialog).toEqual(Message.SucceededShowDialog())
          expect(document.documentElement.style.overflow).toBe('hidden')

          dialog.remove()

          const closeDialog = yield* CloseDialog({
            id: 'vanishing-dialog',
          }).effect.pipe(provideEffects)

          expect(closeDialog).toEqual(Message.CompletedCloseDialog())
          expect(document.documentElement.style.overflow).not.toBe('hidden')
        }).pipe(
          Effect.ensuring(
            Dom.releaseDialogResources('vanishing-dialog').pipe(
              Effect.andThen(Effect.sync(() => dialog.remove())),
            ),
          ),
        )
      },
    )

    it.effect(
      'CloseDialog leaves the scroll lock alone when the dialog holds no resources',
      () => {
        const dialog = document.createElement('dialog')
        dialog.id = 'phantom-dialog'
        dialog.open = true
        document.body.appendChild(dialog)

        return Effect.gen(function* () {
          yield* Dom.lockScroll

          const closeDialog = yield* CloseDialog({
            id: 'phantom-dialog',
          }).effect.pipe(provideEffects)

          expect(closeDialog).toEqual(Message.CompletedCloseDialog())
          expect(document.documentElement.style.overflow).toBe('hidden')
        }).pipe(
          Effect.ensuring(
            Dom.unlockScroll.pipe(
              Effect.andThen(Effect.sync(() => dialog.remove())),
            ),
          ),
        )
      },
    )

    it.effect(
      'CloseDialog leaves the scroll lock alone when it runs before the show completes',
      () => {
        const dialog = document.createElement('dialog')
        dialog.id = 'racing-dialog'
        document.body.appendChild(dialog)

        return Effect.gen(function* () {
          yield* Dom.lockScroll

          const showDialog = yield* Effect.forkChild(
            ShowDialog({
              id: 'racing-dialog',
              focusSelector: initialFocusMarkerSelector,
            }).effect.pipe(provideEffects),
          )

          yield* Effect.yieldNow
          yield* CloseDialog({ id: 'racing-dialog' }).effect.pipe(
            provideEffects,
          )

          expect(document.documentElement.style.overflow).toBe('hidden')

          dialog.remove()

          const showDialogMessage = yield* Fiber.join(showDialog)

          expect(showDialogMessage).toEqual(Message.FailedShowDialog())
          expect(document.documentElement.style.overflow).toBe('hidden')
        }).pipe(
          Effect.ensuring(
            Dom.unlockScroll.pipe(
              Effect.andThen(Effect.sync(() => dialog.remove())),
            ),
          ),
        )
      },
    )
  })

  describe('view OnUnmount gating', () => {
    it.effect(
      'includes the OnUnmount backstop on the dialog while it is open',
      () =>
        Effect.gen(function* () {
          expect(yield* dialogHasOnUnmount(openModel(test))).toBe(true)
        }),
    )

    it.effect('omits the OnUnmount backstop while the dialog is closed', () =>
      Effect.gen(function* () {
        expect(yield* dialogHasOnUnmount(closedModel(test))).toBe(false)
      }),
    )

    it.effect(
      'renders the dialog closed with no OnUnmount backstop after a failed show',
      () =>
        Effect.gen(function* () {
          let dialogShowFailedModel = openModel(test)
          yield* Story.story(
            DialogLive,
            test,
            Story.given(openModel(test)),
            Story.message(Message.FailedShowDialog()),
            Story.model(model => {
              dialogShowFailedModel = model
            }),
          )

          const group = yield* renderGroup(
            dialogShowFailedModel,
            render => render.dialog,
          )
          expect(hasDataAttribute(group, 'open')).toBe(false)
          expect(yield* dialogHasOnUnmount(dialogShowFailedModel)).toBe(false)
        }),
    )
  })

  describe('view modal semantics', () => {
    const ignoreRender = () => {}

    it.effect('marks a visible dialog as modal to assistive technology', () =>
      Scene.scene(
        DialogSceneLive,
        sceneArgs(openModel(test), ignoreRender),
        renderDialog(openModel(test)),
        acknowledgeAcquireResources,
        Scene.expect(Scene.selector('dialog')).toHaveAttr('aria-modal', 'true'),
      ),
    )

    it.effect('omits modal semantics while closed', () =>
      Scene.scene(
        DialogSceneLive,
        sceneArgs(closedModel(test), ignoreRender),
        renderDialog(closedModel(test)),
        Scene.expect(Scene.selector('dialog')).not.toHaveAttr('aria-modal'),
      ),
    )
  })
})
