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
import { Block, Scene, Story } from 'foldkit'
import { DEVTOOLS_HOST_ID } from 'foldkit/devtools-host'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { makeInitialModel as makeAnimationModel } from '../animation/schema.js'
import * as TerminalDialogParent from '../test/apps/dialogTerminal.js'
import {
  AcquireResources,
  CloseDialog,
  DialogBlock,
  InMessage,
  type InitConfig,
  Message,
  Model,
  OutMessage,
  ReleaseDialogResources,
  type RenderInfo,
  ShowDialog,
  descriptionId,
  initialFocusMarkerAttribute,
  initialFocusMarkerSelector,
  layer,
  titleId,
} from './block.js'

type TestHtmlBuilder = Parameters<
  Story.TestBlock<typeof DialogBlock>['view']
>[2]

const acknowledgeCloseDialog = Story.Command.resolve(
  CloseDialog,
  Message.CompletedCloseDialog(),
)

const acknowledgeAcquireResources = Scene.Mount.resolve(
  AcquireResources,
  Message.SucceededAcquireResources(),
)

const DialogEvent = Schema.Literals(['Opened', 'Closed'])
type DialogEvent = typeof DialogEvent.Type

const ParentModel = Schema.Struct({
  dialog: Model,
  dialogEvents: Schema.Array(DialogEvent),
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  CompletedLoadParentData: {},
})
type ParentMessage = typeof ParentMessage.Type

const DialogParentTestKey = Symbol('DialogParentTest')
const DialogParentTestBlock = Block.make('DialogParentTest', {
  key: DialogParentTestKey,
  InitArgs: Schema.Tuple([]),
  Model: ParentModel,
  Message: ParentMessage,
})

const foldDialogOutMessage = DialogParentTestBlock.makeOutMessageFold(
  DialogBlock,
  {
    Opened: () => model => ({
      model: modifyFields(model, {
        dialogEvents: Array.append(DialogEvent.make('Opened')),
      }),
    }),
    Closed: () => model => ({
      model: modifyFields(model, {
        dialogEvents: Array.append(DialogEvent.make('Closed')),
      }),
    }),
    CompletedClose: () => model => ({ model }),
  },
)

const LoadParentData = DialogParentTestBlock.makeCommand('LoadParentData', {
  messages: [ParentMessage.CompletedLoadParentData],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedLoadParentData())
  },
})

const loadParentData = DialogParentTestBlock.makeCommandsStep(() => [
  LoadParentData(),
])

const DialogBinding = DialogParentTestBlock.makeRequiredFieldBinding(
  DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'initial-dialog' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

const DialogParentTestComposition = DialogParentTestBlock.makeComposition({
  bindings: [DialogBinding],
})

const parentInit = DialogParentTestComposition.makeInit(() => ({
  model: { dialogEvents: [] },
  steps: [loadParentData, DialogBinding.requestOpen()],
}))
const ParentBlock = {
  block: DialogParentTestBlock,
  layer: DialogParentTestBlock.makeLayer({
    init: parentInit,
    update: DialogParentTestComposition.makeUpdate({
      CompletedLoadParentData: DialogParentTestBlock.makeNoopStep(),
    }),
    EffectsLayer: LoadParentData.layer,
  }).pipe(Layer.provide(layer)),
}

const provideEffects = Effect.provide(
  Layer.mergeAll(
    ShowDialog.layer,
    CloseDialog.layer,
    ReleaseDialogResources.layer,
    AcquireResources.layer,
  ),
)

const makeFixture = (block: Story.TestBlock<typeof DialogBlock>) => {
  const { init, update, view } = block

  const openDialog = (config: InitConfig) =>
    block.inMessageUpdate(init(config).model, InMessage.RequestedOpen())

  const isDialogVisible = (model: Model): boolean =>
    model.isOpen || model.animation.transitionState !== 'Idle'

  const assertRenderInfo = (
    model: Model,
    assert: (render: RenderInfo) => void,
    hasDescription = false,
  ): void => {
    const sceneView = (currentModel: Model, h: TestHtmlBuilder) =>
      view(
        currentModel,
        {
          hasDescription,
          toView: render => {
            assert(render)
            return h.dialog([...render.dialog])
          },
        },
        h,
      )

    if (isDialogVisible(model)) {
      if (model.animation.transitionState === 'LeaveStart') {
        Scene.scene(
          { update, view: sceneView },
          Scene.given(model),
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
        Scene.scene(
          { update, view: sceneView },
          Scene.given(model),
          acknowledgeAcquireResources,
        )
      }
    } else {
      Scene.scene({ update, view: sceneView }, Scene.given(model))
    }
  }

  const sceneView = (model: Model, h: TestHtmlBuilder) =>
    view(model, { toView: ({ dialog }) => h.dialog([...dialog]) }, h)
  return {
    sceneView,
    init,
    update,
    view,
    openDialog,
    assertRenderInfo,
    provideEffects,
  }
}

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

const hasOnUnmount = <RequiredMountRequirements>(
  group: ReadonlyArray<ChildAttribute<RequiredMountRequirements>>,
): boolean =>
  group.some(({ attribute }) => Predicate.isTagged(attribute, 'OnUnmount'))

it.layer(layer, { buildPerTest: true })(it => {
  describe('Dialog', () => {
    describe('init', () => {
      it.effect('defaults isOpen to false', () =>
        Story.story(
          DialogBlock,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(model).toStrictEqual({
              id: 'test',
              isOpen: false,
              isAnimated: false,
              animation: makeAnimationModel({ id: 'test-panel' }),
              maybeFocusSelector: Option.none(),
            })
          }),
        ),
      )

      it.effect(
        'opens through the update path with the ShowDialog Command and Opened OutMessage',
        () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog } = makeFixture(block)

            const dialogOpen = openDialog({ id: 'test' })

            expect(dialogOpen.model).toStrictEqual({
              id: 'test',
              isOpen: true,
              isAnimated: false,
              animation: makeAnimationModel({ id: 'test-panel' }),
              maybeFocusSelector: Option.none(),
            })
            expect(
              dialogOpen.commands?.map(({ name, args }) => ({ name, args })),
            ).toStrictEqual([
              {
                name: 'Dialog/ShowDialog',
                args: {
                  id: 'test',
                  focusSelector: initialFocusMarkerSelector,
                },
              },
            ])
            expect(dialogOpen.outMessage).toStrictEqual(OutMessage.Opened())
          }),
      )

      it.effect(
        'opens through the Binding while preserving root Commands and folding Opened',
        () =>
          Story.withBlock(ParentBlock, parent => {
            const parentOpen = parent.init()

            expect(parentOpen.model.dialog.isOpen).toBe(true)
            expect(parentOpen.model.dialogEvents).toStrictEqual(['Opened'])
            expect(
              parentOpen.commands?.map(({ name, args }) => ({ name, args })),
            ).toStrictEqual([
              {
                name: 'DialogParentTest/LoadParentData',
                args: undefined,
              },
              {
                name: 'dialog/ShowDialog',
                args: {
                  id: 'initial-dialog',
                  focusSelector: initialFocusMarkerSelector,
                },
              },
            ])
          }),
      )

      it.effect('accepts a focusSelector', () =>
        Story.story(
          DialogBlock,
          Story.init({ id: 'test', focusSelector: '#search-input' }),
          Story.model(model => {
            expect(model).toStrictEqual({
              id: 'test',
              isOpen: false,
              isAnimated: false,
              animation: makeAnimationModel({ id: 'test-panel' }),
              maybeFocusSelector: Option.some('#search-input'),
            })
          }),
        ),
      )
    })

    describe('update', () => {
      describe('non-animated', () => {
        it.effect('opens when closed on RequestedOpen and emits Opened', () =>
          Story.story(
            DialogBlock,
            Story.init({ id: 'test' }),
            Story.inMessage(InMessage.RequestedOpen()),
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
              DialogBlock,
              Story.init({ id: 'test' }),
              Story.inMessage(InMessage.RequestedOpen()),
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
              DialogBlock,
              Story.init({ id: 'test', focusSelector: '#search-input' }),
              Story.inMessage(InMessage.RequestedOpen()),
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
              DialogBlock,
              Story.init({ id: 'test' }),
              Story.inMessage(InMessage.RequestedOpen()),
              Story.Command.resolve(ShowDialog, Message.SucceededShowDialog()),
              Story.inMessage(InMessage.RequestedOpen()),
              Story.expectNoOutMessage(),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
              }),
            ),
        )

        it.effect('closes when open on RequestedClose and emits Closed', () =>
          Story.story(
            DialogBlock,
            Story.init({ id: 'test' }),
            Story.inMessage(InMessage.RequestedOpen()),
            Story.Command.resolve(ShowDialog, Message.SucceededShowDialog()),
            Story.inMessage(InMessage.RequestedClose()),
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
              DialogBlock,
              Story.init({ id: 'test' }),
              Story.inMessage(InMessage.RequestedClose()),
              Story.expectNoOutMessage(),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
              }),
            ),
        )

        it.effect(
          'returns model unchanged on SucceededShowDialog while open',
          () =>
            Story.withBlock(DialogBlock, block => {
              const { openDialog } = makeFixture(block)

              const originalModel = openDialog({ id: 'test' }).model
              return Story.story(
                DialogBlock,
                Story.given(originalModel),
                Story.message(Message.SucceededShowDialog()),
                Story.model(model => {
                  expect(model).toBe(originalModel)
                }),
                Story.Command.expectNone(),
              )
            }),
        )

        it.effect(
          'dispatches CloseDialog when the show succeeds after the dialog closed',
          () =>
            Story.story(
              DialogBlock,
              Story.init({ id: 'test' }),
              Story.message(Message.SucceededShowDialog()),
              Story.expectNoOutMessage(),
              Story.Command.resolve(
                CloseDialog,
                Message.CompletedCloseDialog(),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
              }),
            ),
        )

        it.effect(
          'dispatches CloseDialog when Mount acquisition succeeds after the dialog closed',
          () =>
            Story.story(
              DialogBlock,
              Story.init({ id: 'test' }),
              Story.message(Message.SucceededAcquireResources()),
              Story.expectNoOutMessage(),
              Story.Command.resolve(
                CloseDialog,
                Message.CompletedCloseDialog(),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
              }),
            ),
        )

        it.effect(
          'closes the model when Mount acquisition fails while open',
          () =>
            Story.withBlock(DialogBlock, block => {
              const { openDialog } = makeFixture(block)

              return Story.story(
                DialogBlock,
                Story.given(openDialog({ id: 'test' }).model),
                Story.message(Message.FailedAcquireResources()),
                Story.expectOutMessage(OutMessage.Closed()),
                Story.model(model => {
                  expect(model.isOpen).toBe(false)
                }),
                acknowledgeCloseDialog,
                Story.expectOutMessage(OutMessage.CompletedClose()),
                Story.Command.expectNone(),
              )
            }),
        )

        it.effect(
          'immediately resets an entering animation when Mount acquisition fails',
          () =>
            Story.withBlock(DialogBlock, block => {
              const { openDialog } = makeFixture(block)

              const enteringModel = modifyFields(
                openDialog({ id: 'test', isAnimated: true }).model,
                {
                  animation: () =>
                    modifyFields(
                      makeAnimationModel({ id: 'test-panel', isShowing: true }),
                      {
                        transitionState: () => 'EnterAnimating',
                        transitionGeneration: () => 1,
                      },
                    ),
                },
              )

              return Story.story(
                DialogBlock,
                Story.given(enteringModel),
                Story.message(Message.FailedAcquireResources()),
                Story.expectOutMessage(OutMessage.Closed()),
                Story.model(model => {
                  expect(model.isOpen).toBe(false)
                  expect(model.animation.isShowing).toBe(false)
                  expect(model.animation.transitionState).toBe('Idle')
                  expect(model.animation.transitionGeneration).toBe(1)
                }),
                acknowledgeCloseDialog,
                Story.expectOutMessage(OutMessage.CompletedClose()),
                Story.Command.expectNone(),
              )
            }),
        )
      })

      describe('animated', () => {
        it.effect('opens with enter animation on RequestedOpen', () =>
          Story.story(
            DialogBlock,
            Story.init({ id: 'test', isAnimated: true }),
            Story.inMessage(InMessage.RequestedOpen()),
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
            Story.withBlock(DialogBlock, block => {
              const { openDialog } = makeFixture(block)

              return Story.story(
                DialogBlock,
                Story.given(openDialog({ id: 'test', isAnimated: true }).model),
                Story.inMessage(InMessage.RequestedClose()),
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
              )
            }),
        )

        it.effect('resumes EnterStart after lifecycle acquisition', () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog } = makeFixture(block)

            return Story.story(
              DialogBlock,
              Story.given(openDialog({ id: 'test', isAnimated: true }).model),
              Story.message(Message.SucceededAcquireResources()),
              Story.Command.expectHas(
                Animation.WaitForPaint({ generation: 1 }),
              ),
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
            )
          }),
        )

        it.effect('resumes EnterAnimating after lifecycle acquisition', () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog } = makeFixture(block)

            const enteringModel = modifyFields(
              openDialog({ id: 'test', isAnimated: true }).model,
              {
                animation: animation =>
                  modifyFields(animation, {
                    transitionState: () => 'EnterAnimating',
                  }),
              },
            )

            return Story.story(
              DialogBlock,
              Story.given(enteringModel),
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
            )
          }),
        )

        it.effect('resumes LeaveStart after lifecycle acquisition', () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog } = makeFixture(block)

            const dialogClose = block.inMessageUpdate(
              openDialog({ id: 'test', isAnimated: true }).model,
              InMessage.RequestedClose(),
            )

            return Story.story(
              DialogBlock,
              Story.given(dialogClose.model),
              Story.message(Message.SucceededAcquireResources()),
              Story.Command.expectHas(
                Animation.WaitForPaint({ generation: 2 }),
              ),
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
            )
          }),
        )

        it.effect('resumes LeaveAnimating after lifecycle acquisition', () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog } = makeFixture(block)

            const leavingModel = modifyFields(
              block.inMessageUpdate(
                openDialog({ id: 'test', isAnimated: true }).model,
                InMessage.RequestedClose(),
              ).model,
              {
                animation: animation =>
                  modifyFields(animation, {
                    transitionState: () => 'LeaveAnimating',
                  }),
              },
            )

            return Story.story(
              DialogBlock,
              Story.given(leavingModel),
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
            )
          }),
        )

        it.effect('ignores RequestedClose when already in LeaveStart', () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog } = makeFixture(block)

            const leavingModel = modifyFields(
              openDialog({ id: 'test', isAnimated: true }).model,
              {
                isOpen: () => false,
                animation: () =>
                  modifyFields(
                    makeAnimationModel({ id: 'test-panel', isShowing: false }),
                    {
                      transitionState: () => 'LeaveStart',
                    },
                  ),
              },
            )
            return Story.story(
              DialogBlock,
              Story.given(leavingModel),
              Story.inMessage(InMessage.RequestedClose()),
              Story.model(model => {
                expect(model).toBe(leavingModel)
              }),
              Story.Command.expectNone(),
            )
          }),
        )

        it.effect(
          'dispatches no CloseDialog when the show succeeds during the leave animation',
          () =>
            Story.withBlock(DialogBlock, block => {
              const { openDialog } = makeFixture(block)

              const leavingModel = modifyFields(
                openDialog({ id: 'test', isAnimated: true }).model,
                {
                  isOpen: () => false,
                  animation: () =>
                    modifyFields(
                      makeAnimationModel({
                        id: 'test-panel',
                        isShowing: false,
                      }),
                      {
                        transitionState: () => 'LeaveStart',
                      },
                    ),
                },
              )
              return Story.story(
                DialogBlock,
                Story.given(leavingModel),
                Story.message(Message.SucceededShowDialog()),
                Story.model(model => {
                  expect(model).toBe(leavingModel)
                }),
                Story.Command.expectNone(),
              )
            }),
        )

        it.effect('ignores RequestedClose when already in LeaveAnimating', () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog } = makeFixture(block)

            const leavingModel = modifyFields(
              openDialog({ id: 'test', isAnimated: true }).model,
              {
                isOpen: () => false,
                animation: () =>
                  modifyFields(
                    makeAnimationModel({ id: 'test-panel', isShowing: false }),
                    {
                      transitionState: () => 'LeaveAnimating',
                    },
                  ),
              },
            )
            return Story.story(
              DialogBlock,
              Story.given(leavingModel),
              Story.inMessage(InMessage.RequestedClose()),
              Story.model(model => {
                expect(model).toBe(leavingModel)
              }),
              Story.Command.expectNone(),
            )
          }),
        )
      })

      describe('Unmounted', () => {
        it.effect(
          'reports Closed while resetting the model and releasing resources',
          () =>
            Story.story(
              DialogBlock,
              Story.init({ id: 'test' }),
              Story.inMessage(InMessage.RequestedOpen()),
              Story.Command.resolve(ShowDialog, Message.SucceededShowDialog()),
              Story.message(Message.Unmounted()),
              Story.expectOutMessage(OutMessage.Closed()),
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
            Story.withBlock(DialogBlock, block => {
              const { openDialog } = makeFixture(block)

              const leavingModel = modifyFields(
                openDialog({ id: 'test', isAnimated: true }).model,
                {
                  isOpen: () => false,
                  animation: () =>
                    modifyFields(
                      makeAnimationModel({
                        id: 'test-panel',
                        isShowing: false,
                      }),
                      {
                        transitionState: () => 'LeaveAnimating',
                        transitionGeneration: () => 2,
                      },
                    ),
                },
              )
              return Story.story(
                DialogBlock,
                Story.given(leavingModel),
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
              )
            }),
        )

        it.effect('is a no-op when the dialog is already closed', () =>
          Story.withBlock(DialogBlock, block => {
            const { init } = makeFixture(block)

            const closedModel = init({ id: 'test' }).model
            return Story.story(
              DialogBlock,
              Story.given(closedModel),
              Story.message(Message.Unmounted()),
              Story.expectNoOutMessage(),
              Story.model(model => {
                expect(model).toBe(closedModel)
              }),
              Story.Command.expectNone(),
            )
          }),
        )

        it.effect(
          'returns the model unchanged on CompletedReleaseDialogResources',
          () =>
            Story.withBlock(DialogBlock, block => {
              const { init } = makeFixture(block)

              const originalModel = init({ id: 'test' }).model
              return Story.story(
                DialogBlock,
                Story.given(originalModel),
                Story.message(Message.CompletedReleaseDialogResources()),
                Story.model(model => {
                  expect(model).toBe(originalModel)
                }),
              )
            }),
        )
      })

      describe('FailedShowDialog', () => {
        it.effect(
          'reports Closed and completes native cleanup when showing fails',
          () =>
            Story.story(
              DialogBlock,
              Story.init({ id: 'test' }),
              Story.inMessage(InMessage.RequestedOpen()),
              Story.Command.resolve(ShowDialog, Message.FailedShowDialog()),
              Story.expectOutMessage(OutMessage.Closed()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
              }),
              acknowledgeCloseDialog,
              Story.expectOutMessage(OutMessage.CompletedClose()),
              Story.Command.expectNone(),
            ),
        )

        it.effect('resets a running enter animation to Idle', () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog } = makeFixture(block)

            const enteringModel = modifyFields(
              openDialog({ id: 'test', isAnimated: true }).model,
              {
                animation: () =>
                  modifyFields(
                    makeAnimationModel({ id: 'test-panel', isShowing: true }),
                    {
                      transitionState: () => 'EnterAnimating',
                      transitionGeneration: () => 1,
                    },
                  ),
              },
            )
            return Story.story(
              DialogBlock,
              Story.given(enteringModel),
              Story.message(Message.FailedShowDialog()),
              Story.expectOutMessage(OutMessage.Closed()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.animation.isShowing).toBe(false)
                expect(model.animation.transitionState).toBe('Idle')
                expect(model.animation.transitionGeneration).toBe(1)
              }),
              acknowledgeCloseDialog,
              Story.expectOutMessage(OutMessage.CompletedClose()),
              Story.Command.expectNone(),
            )
          }),
        )

        for (const failure of [
          Message.FailedShowDialog(),
          Message.FailedAcquireResources(),
        ]) {
          it.effect(
            `resets a running leave animation after ${failure._tag}`,
            () =>
              Story.withBlock(DialogBlock, block => {
                const { openDialog } = makeFixture(block)

                const leavingModel = modifyFields(
                  openDialog({ id: 'test', isAnimated: true }).model,
                  {
                    isOpen: () => false,
                    animation: () =>
                      modifyFields(
                        makeAnimationModel({
                          id: 'test-panel',
                          isShowing: false,
                        }),
                        {
                          transitionState: () => 'LeaveAnimating',
                        },
                      ),
                  },
                )
                return Story.story(
                  DialogBlock,
                  Story.given(leavingModel),
                  Story.message(failure),
                  Story.expectNoOutMessage(),
                  Story.model(model => {
                    expect(model.isOpen).toBe(false)
                    expect(model.animation.isShowing).toBe(false)
                    expect(model.animation.transitionState).toBe('Idle')
                  }),
                  acknowledgeCloseDialog,
                  Story.expectOutMessage(OutMessage.CompletedClose()),
                  Story.Command.expectNone(),
                )
              }),
          )
        }

        it.effect('does nothing when the dialog is already closed', () =>
          Story.withBlock(DialogBlock, block => {
            const { init } = makeFixture(block)

            const closedModel = init({ id: 'test' }).model
            return Story.story(
              DialogBlock,
              Story.given(closedModel),
              Story.message(Message.FailedShowDialog()),
              Story.expectNoOutMessage(),
              Story.model(model => {
                expect(model).toBe(closedModel)
              }),
              Story.message(Message.FailedAcquireResources()),
              Story.expectNoOutMessage(),
              Story.model(model => {
                expect(model).toBe(closedModel)
              }),
              Story.Command.expectNone(),
            )
          }),
        )

        it.effect(
          'dispatches no CloseDialog when the dialog is closed after a failed show',
          () =>
            Story.story(
              DialogBlock,
              Story.init({ id: 'test' }),
              Story.inMessage(InMessage.RequestedOpen()),
              Story.Command.resolve(ShowDialog, Message.FailedShowDialog()),
              Story.expectOutMessage(OutMessage.Closed()),
              acknowledgeCloseDialog,
              Story.expectOutMessage(OutMessage.CompletedClose()),
              Story.inMessage(InMessage.RequestedClose()),
              Story.expectNoOutMessage(),
              Story.Command.expectNone(),
            ),
        )
      })

      describe('parent close policy', () => {
        for (const isAnimated of [false, true]) {
          for (const failure of ['show', 'acquisition']) {
            it.effect(
              `retains the ${isAnimated ? 'animated' : 'plain'} child until ${failure} failure cleanup completes`,
              () =>
                Story.story(
                  {
                    block: TerminalDialogParent.TerminalDialogParentBlock,
                    layer: TerminalDialogParent.layer,
                  },
                  Story.init(),
                  Story.inMessage(
                    TerminalDialogParent.TerminalDialogParentBlock.InMessage.RequestedOpen(
                      {
                        key: 'first',
                        isAnimated,
                      },
                    ),
                  ),
                  Story.Command.resolve(
                    ShowDialog,
                    failure === 'show'
                      ? Message.FailedShowDialog()
                      : Message.SucceededShowDialog(),
                  ),
                  ...(failure === 'acquisition'
                    ? [
                        Story.messageIn(
                          TerminalDialogParent.MaybeDialogInstanceBinding,
                          'first',
                          Message.FailedAcquireResources(),
                        ),
                      ]
                    : []),
                  Story.model(model => {
                    expect(Option.isSome(model.maybeDialogInstance)).toBe(true)
                    expect(model.closedKeys).toEqual(['first'])
                    expect(model.completedKeys).toEqual([])
                  }),
                  Story.Command.expectHas(CloseDialog({ id: 'first' })),
                  ...(isAnimated
                    ? [
                        Story.Command.resolve(
                          Animation.WaitForPaint,
                          Animation.Message.CompletedWaitForPaint({
                            generation: 1,
                          }),
                        ),
                      ]
                    : []),
                  Story.Command.resolve(
                    CloseDialog,
                    Message.CompletedCloseDialog(),
                  ),
                  Story.model(model => {
                    expect(model.maybeDialogInstance).toEqual(Option.none())
                    expect(model.closedKeys).toEqual(['first'])
                    expect(model.completedKeys).toEqual(['first'])
                  }),
                  Story.Command.expectNone(),
                ),
            )
          }
        }

        it.effect(
          'ignores the cleanup result after the parent removes the occurrence',
          () =>
            Story.story(
              {
                block: TerminalDialogParent.TerminalDialogParentBlock,
                layer: TerminalDialogParent.layer,
              },
              Story.init(),
              Story.inMessage(
                TerminalDialogParent.TerminalDialogParentBlock.InMessage.RequestedOpen(
                  {
                    key: 'first',
                    isAnimated: false,
                  },
                ),
              ),
              Story.Command.resolve(ShowDialog, Message.FailedShowDialog()),
              Story.inMessage(
                TerminalDialogParent.TerminalDialogParentBlock.InMessage.RequestedCancel(),
              ),
              Story.Command.resolve(
                CloseDialog,
                Message.CompletedCloseDialog(),
              ),
              Story.model(model => {
                expect(model.maybeDialogInstance).toEqual(Option.none())
                expect(model.completedKeys).toEqual([])
              }),
              Story.Command.expectNone(),
            ),
        )

        it.effect(
          'does not route the old cleanup result into a replacement occurrence',
          () =>
            Story.story(
              {
                block: TerminalDialogParent.TerminalDialogParentBlock,
                layer: TerminalDialogParent.layer,
              },
              Story.init(),
              Story.inMessage(
                TerminalDialogParent.TerminalDialogParentBlock.InMessage.RequestedOpen(
                  {
                    key: 'first',
                    isAnimated: false,
                  },
                ),
              ),
              Story.Command.resolve(ShowDialog, Message.FailedShowDialog()),
              Story.inMessage(
                TerminalDialogParent.TerminalDialogParentBlock.InMessage.RequestedOpen(
                  {
                    key: 'second',
                    isAnimated: false,
                  },
                ),
              ),
              Story.Command.resolve(ShowDialog, Message.SucceededShowDialog()),
              Story.Command.resolve(
                CloseDialog({ id: 'first' }),
                Message.CompletedCloseDialog(),
              ),
              Story.model(model => {
                expect(
                  Option.map(
                    model.maybeDialogInstance,
                    instance => instance.key,
                  ),
                ).toEqual(Option.some('second'))
                expect(
                  Option.map(
                    model.maybeDialogInstance,
                    instance => instance.model.isOpen,
                  ),
                ).toEqual(Option.some(true))
                expect(model.completedKeys).toEqual([])
              }),
              Story.Command.expectNone(),
            ),
        )

        it.effect('runs when the native dialog fails to show', () =>
          Story.story(
            ParentBlock,
            Story.init(),
            Story.Command.resolve(
              LoadParentData,
              ParentMessage.CompletedLoadParentData(),
            ),
            Story.Command.resolve(ShowDialog, Message.FailedShowDialog()),
            acknowledgeCloseDialog,
            Story.model(model => {
              expect(model.dialog.isOpen).toBe(false)
              expect(model.dialogEvents).toStrictEqual(['Opened', 'Closed'])
            }),
          ),
        )

        it.effect('runs when lifecycle acquisition fails', () =>
          Story.story(
            ParentBlock,
            Story.init(),
            Story.Command.resolveAll(
              [LoadParentData, ParentMessage.CompletedLoadParentData()],
              [ShowDialog, Message.SucceededShowDialog()],
            ),
            Story.messageIn(DialogBinding, Message.FailedAcquireResources()),
            acknowledgeCloseDialog,
            Story.model(model => {
              expect(model.dialog.isOpen).toBe(false)
              expect(model.dialogEvents).toStrictEqual(['Opened', 'Closed'])
            }),
          ),
        )

        it.effect('runs when the open dialog unmounts', () =>
          Story.story(
            ParentBlock,
            Story.init(),
            Story.Command.resolveAll(
              [LoadParentData, ParentMessage.CompletedLoadParentData()],
              [ShowDialog, Message.SucceededShowDialog()],
            ),
            Story.messageIn(DialogBinding, Message.Unmounted()),
            Story.model(model => {
              expect(model.dialog.isOpen).toBe(false)
              expect(model.dialogEvents).toStrictEqual(['Opened', 'Closed'])
            }),
            Story.Command.resolve(
              ReleaseDialogResources,
              Message.CompletedReleaseDialogResources(),
            ),
          ),
        )
      })
    })

    describe('titleId', () => {
      it.effect('returns the id suffixed with -dialog-title', () =>
        Story.story(
          DialogBlock,
          Story.init({ id: 'my-dialog' }),
          Story.model(model => {
            expect(titleId(model)).toBe('my-dialog-dialog-title')
          }),
        ),
      )
    })

    describe('descriptionId', () => {
      it.effect('returns the id suffixed with -dialog-description', () =>
        Story.story(
          DialogBlock,
          Story.init({ id: 'my-dialog' }),
          Story.model(model => {
            expect(descriptionId(model)).toBe('my-dialog-dialog-description')
          }),
        ),
      )
    })

    describe('RenderInfo title and description', () => {
      it.effect('publishes the title id the dialog labels itself by', () =>
        Story.withBlock(DialogBlock, block => {
          const { init, assertRenderInfo } = makeFixture(block)

          const model = init({ id: 'my-dialog' }).model
          assertRenderInfo(model, ({ title }) =>
            expect(hasIdAttribute(title, titleId(model))).toBe(true),
          )
        }),
      )

      it.effect(
        'publishes the description id the dialog describes itself by',
        () =>
          Story.withBlock(DialogBlock, block => {
            const { init, assertRenderInfo } = makeFixture(block)

            const model = init({ id: 'my-dialog' }).model
            assertRenderInfo(model, ({ description }) =>
              expect(hasIdAttribute(description, descriptionId(model))).toBe(
                true,
              ),
            )
          }),
      )
    })

    describe('RenderInfo dialog', () => {
      it.effect('omits aria-describedby by default', () =>
        Story.withBlock(DialogBlock, block => {
          const { assertRenderInfo, init } = makeFixture(block)

          assertRenderInfo(init({ id: 'my-dialog' }).model, ({ dialog }) =>
            expect(
              hasAriaDescribedBy(dialog, 'my-dialog-dialog-description'),
            ).toBe(false),
          )
        }),
      )

      it.effect('references the description when opted in', () =>
        Story.withBlock(DialogBlock, block => {
          const { assertRenderInfo, init } = makeFixture(block)

          assertRenderInfo(
            init({ id: 'my-dialog' }).model,
            ({ dialog }) =>
              expect(
                hasAriaDescribedBy(dialog, 'my-dialog-dialog-description'),
              ).toBe(true),
            true,
          )
        }),
      )

      it.effect('suppresses native cancel events', () =>
        Story.withBlock(DialogBlock, block => {
          const { assertRenderInfo, init } = makeFixture(block)

          assertRenderInfo(init({ id: 'my-dialog' }).model, ({ dialog }) =>
            expect(hasCancelPrevention(dialog)).toBe(true),
          )
        }),
      )

      it.effect('maps the showDialog Escape signal', () =>
        Story.withBlock(DialogBlock, block => {
          const { assertRenderInfo, init } = makeFixture(block)

          assertRenderInfo(init({ id: 'my-dialog' }).model, ({ dialog }) =>
            expect(hasEscapeCancelMapping(dialog)).toBe(true),
          )
        }),
      )
    })

    describe('RenderInfo closeButton', () => {
      it.effect(
        'publishes type button so a close control does not submit a form',
        () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog, assertRenderInfo } = makeFixture(block)

            const model = openDialog({ id: 'my-dialog' }).model
            assertRenderInfo(model, ({ closeButton }) =>
              expect(hasButtonType(closeButton)).toBe(true),
            )
          }),
      )

      it.effect('publishes type button while the leave animation runs', () =>
        Story.withBlock(DialogBlock, block => {
          const { openDialog, assertRenderInfo } = makeFixture(block)

          const leavingModel = modifyFields(
            openDialog({ id: 'my-dialog', isAnimated: true }).model,
            {
              isOpen: () => false,
              animation: () =>
                modifyFields(
                  makeAnimationModel({
                    id: 'my-dialog-panel',
                    isShowing: false,
                  }),
                  {
                    transitionState: () => 'LeaveStart',
                    transitionGeneration: () => 2,
                  },
                ),
            },
          )
          assertRenderInfo(leavingModel, ({ closeButton }) =>
            expect(hasButtonType(closeButton)).toBe(true),
          )
        }),
      )
    })

    describe('RenderInfo initialFocus', () => {
      it.effect('publishes the marker the dialog focuses on open', () =>
        Story.withBlock(DialogBlock, block => {
          const { init, assertRenderInfo } = makeFixture(block)

          const model = init({ id: 'my-dialog' }).model
          assertRenderInfo(model, ({ initialFocus }) =>
            expect(
              hasDataAttribute(initialFocus, initialFocusMarkerAttribute),
            ).toBe(true),
          )
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
        () =>
          Story.withBlock(DialogBlock, block => {
            const { openDialog, provideEffects } = makeFixture(block)

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
              const dialogBoot = openDialog({ id: 'modal-dialog' })
              const showDialogCommand = Option.getOrThrow(
                Array.head(dialogBoot.commands ?? []),
              )
              const showDialog = yield* ShowDialog(
                Option.getOrThrow(
                  Story.Command.argsOf(ShowDialog)(showDialogCommand),
                ),
              ).effect.pipe(provideEffects)

              expect(dialogBoot.model.isOpen).toBe(true)
              expect(showDialog).toEqual(Message.SucceededShowDialog())
              expect(background.inert).toBe(true)
              expect(background.getAttribute('aria-hidden')).toBe('true')
              expect(devToolsHost.inert).toBe(false)

              yield* CloseDialog({ id: 'modal-dialog' }).effect.pipe(
                provideEffects,
              )

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
          }),
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
        'completes failure closure after native close, isolation and focus cleanup',
        () => {
          const background = document.createElement('main')
          const trigger = document.createElement('button')
          background.appendChild(trigger)
          const dialog = document.createElement('dialog')
          dialog.id = 'terminal-cleanup'
          const dialogButton = document.createElement('button')
          dialog.appendChild(dialogButton)
          document.body.append(background, dialog)
          trigger.focus()
          const close = vi.spyOn(dialog, 'close')
          const isolationAtFocus: Array<boolean> = []

          return Story.withBlock(DialogBlock, executable =>
            Effect.gen(function* () {
              const dialogOpen = executable.inMessageUpdate(
                executable.init({ id: dialog.id }).model,
                InMessage.RequestedOpen(),
              )
              yield* ShowDialog({
                id: dialog.id,
                focusSelector: initialFocusMarkerSelector,
              }).effect.pipe(provideEffects)
              trigger.addEventListener('focus', () =>
                isolationAtFocus.push(background.inert),
              )

              const dialogFailure = executable.update(
                dialogOpen.model,
                Message.FailedAcquireResources(),
              )
              expect(dialogFailure.outMessage).toEqual(OutMessage.Closed())
              expect(
                dialogFailure.commands?.map(command => ({
                  name: command.name,
                  args: command.args,
                })),
              ).toEqual([{ name: CloseDialog.name, args: { id: dialog.id } }])
              expect(close).not.toHaveBeenCalled()
              expect(background.inert).toBe(true)
              expect(document.documentElement.style.overflow).toBe('hidden')
              expect(document.activeElement).toBe(dialogButton)

              const closeMessage = yield* CloseDialog({
                id: dialog.id,
              }).effect.pipe(provideEffects)
              expect(close).toHaveBeenCalledTimes(1)
              expect(dialog.open).toBe(false)
              expect(background.inert).toBe(false)
              expect(document.documentElement.style.overflow).not.toBe('hidden')
              expect(document.activeElement).toBe(trigger)
              expect(isolationAtFocus).toEqual([false])

              const dialogClose = executable.update(
                dialogFailure.model,
                closeMessage,
              )
              expect(dialogClose.outMessage).toEqual(
                OutMessage.CompletedClose(),
              )
            }),
          ).pipe(
            Effect.ensuring(
              Dom.releaseDialogResources(dialog.id).pipe(
                Effect.andThen(
                  Effect.sync(() => {
                    close.mockRestore()
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
          Story.withBlock(DialogBlock, block => {
            const { assertRenderInfo, openDialog } = makeFixture(block)

            assertRenderInfo(openDialog({ id: 'test' }).model, ({ dialog }) =>
              expect(hasOnUnmount(dialog)).toBe(true),
            )
          }),
      )

      it.effect('omits the OnUnmount backstop while the dialog is closed', () =>
        Story.withBlock(DialogBlock, block => {
          const { assertRenderInfo, init } = makeFixture(block)

          assertRenderInfo(init({ id: 'test' }).model, ({ dialog }) =>
            expect(hasOnUnmount(dialog)).toBe(false),
          )
        }),
      )

      it.effect(
        'renders the dialog closed with no OnUnmount backstop after a failed show',
        () =>
          Story.withBlock(DialogBlock, block => {
            const { update, openDialog, assertRenderInfo } = makeFixture(block)

            const dialogShowFailed = update(
              openDialog({ id: 'test' }).model,
              Message.FailedShowDialog(),
            )

            assertRenderInfo(dialogShowFailed.model, ({ dialog }) => {
              expect(hasDataAttribute(dialog, 'open')).toBe(false)
              expect(hasOnUnmount(dialog)).toBe(false)
            })
          }),
      )
    })

    describe('view modal semantics', () => {
      it.effect('marks a visible dialog as modal to assistive technology', () =>
        Story.withBlock(DialogBlock, block => {
          const { update, sceneView, openDialog } = makeFixture(block)

          Scene.scene(
            { update, view: sceneView },
            Scene.given(openDialog({ id: 'test' }).model),
            acknowledgeAcquireResources,
            Scene.expect(Scene.selector('dialog')).toHaveAttr(
              'aria-modal',
              'true',
            ),
          )
        }),
      )

      it.effect('omits modal semantics while closed', () =>
        Story.withBlock(DialogBlock, block => {
          const { update, sceneView, init } = makeFixture(block)

          Scene.scene(
            { update, view: sceneView },
            Scene.given(init({ id: 'test' }).model),
            Scene.expect(Scene.selector('dialog')).not.toHaveAttr('aria-modal'),
          )
        }),
      )
    })
  })
})
