import { Effect, Fiber, Option, Predicate } from 'effect'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute, HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import {
  CloseDialog,
  Message,
  type Model,
  OutMessage,
  ReleaseDialogResources,
  type RenderInfo,
  ShowDialog,
  descriptionId,
  init,
  initialFocusMarkerAttribute,
  initialFocusMarkerSelector,
  titleId,
  update,
  view,
} from './index.js'

const isOnUnmount = (childAttribute: ChildAttribute): boolean =>
  Predicate.isTagged(childAttribute.attribute, 'OnUnmount')

// Renders the dialog view through the Scene harness (which manages the runtime
// frame) and reports whether the published `dialog` attribute group carries the
// OnUnmount backstop.
const dialogHasOnUnmount = (model: Model): boolean => {
  let hasOnUnmount = false
  const sceneView = (currentModel: Model, h: HtmlBuilder<Message>) =>
    view(
      currentModel,
      {
        toView: ({ dialog }) => {
          hasOnUnmount = dialog.some(isOnUnmount)
          return h.dialog([...dialog])
        },
      },
      h,
    )

  Scene.scene({ update, view: sceneView }, Scene.given(model))
  return hasOnUnmount
}

// Renders the dialog view through the Scene harness and returns the chosen
// RenderInfo attribute group so a test can inspect what the consumer receives.
const renderGroup = (
  model: Model,
  selectGroup: (render: RenderInfo) => ReadonlyArray<ChildAttribute>,
): ReadonlyArray<ChildAttribute> => {
  let captured: ReadonlyArray<ChildAttribute> = []
  const sceneView = (currentModel: Model, h: HtmlBuilder<Message>) =>
    view(
      currentModel,
      {
        toView: render => {
          captured = selectGroup(render)
          return h.dialog([...render.dialog])
        },
      },
      h,
    )

  Scene.scene({ update, view: sceneView }, Scene.given(model))
  return captured
}

const hasIdAttribute = (
  group: ReadonlyArray<ChildAttribute>,
  id: string,
): boolean =>
  group.some(
    ({ attribute }) =>
      Predicate.isTagged(attribute, 'Id') &&
      Predicate.hasProperty(attribute, 'value') &&
      attribute.value === id,
  )

const hasDataAttribute = (
  group: ReadonlyArray<ChildAttribute>,
  key: string,
): boolean =>
  group.some(
    ({ attribute }) =>
      Predicate.isTagged(attribute, 'DataAttribute') &&
      Predicate.hasProperty(attribute, 'key') &&
      attribute.key === key,
  )

const hasButtonType = (group: ReadonlyArray<ChildAttribute>): boolean =>
  group.some(
    ({ attribute }) =>
      Predicate.isTagged(attribute, 'Type') &&
      Predicate.hasProperty(attribute, 'value') &&
      attribute.value === 'button',
  )

describe('Dialog', () => {
  describe('init', () => {
    it('defaults isOpen to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        animation: Animation.init({ id: 'test-panel' }),
        maybeFocusSelector: Option.none(),
      })
    })

    it('accepts a custom isOpen', () => {
      expect(init({ id: 'test', isOpen: true })).toStrictEqual({
        id: 'test',
        isOpen: true,
        isAnimated: false,
        animation: Animation.init({ id: 'test-panel', isShowing: true }),
        maybeFocusSelector: Option.none(),
      })
    })

    it('accepts a focusSelector', () => {
      expect(
        init({ id: 'test', focusSelector: '#search-input' }),
      ).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        animation: Animation.init({ id: 'test-panel' }),
        maybeFocusSelector: Option.some('#search-input'),
      })
    })
  })

  describe('update', () => {
    describe('non-animated', () => {
      it('opens when closed on RequestedOpen and emits Opened', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test' })),
          Story.message(Message.RequestedOpen()),
          Story.expectOutMessage(OutMessage.Opened()),
          Story.Command.resolve(ShowDialog, Message.SucceededShowDialog()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('shows with the initialFocus marker selector when no focusSelector is configured', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test' })),
          Story.message(Message.RequestedOpen()),
          Story.Command.resolve(
            ShowDialog({
              id: 'test',
              focusSelector: initialFocusMarkerSelector,
            }),
            Message.SucceededShowDialog(),
          ),
        )
      })

      it('shows with the configured focusSelector, which wins over the marker', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', focusSelector: '#search-input' })),
          Story.message(Message.RequestedOpen()),
          Story.Command.resolve(
            ShowDialog({ id: 'test', focusSelector: '#search-input' }),
            Message.SucceededShowDialog(),
          ),
        )
      })

      it('opens without command or OutMessage when already open on RequestedOpen', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isOpen: true })),
          Story.message(Message.RequestedOpen()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('closes when open on RequestedClose and emits Closed', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isOpen: true })),
          Story.message(Message.RequestedClose()),
          Story.expectOutMessage(OutMessage.Closed()),
          Story.Command.resolve(CloseDialog, Message.CompletedCloseDialog()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('closes without command or OutMessage when already closed on RequestedClose', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test' })),
          Story.message(Message.RequestedClose()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('returns model unchanged on SucceededShowDialog while open', () => {
        const originalModel = init({ id: 'test', isOpen: true })
        Story.story(
          update,
          Story.given(originalModel),
          Story.message(Message.SucceededShowDialog()),
          Story.model(model => {
            expect(model).toBe(originalModel)
          }),
          Story.Command.expectNone(),
        )
      })

      it('dispatches CloseDialog when the show succeeds after the dialog closed', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test' })),
          Story.message(Message.SucceededShowDialog()),
          Story.expectNoOutMessage(),
          Story.Command.resolve(CloseDialog, Message.CompletedCloseDialog()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('animated', () => {
      it('opens with enter animation on RequestedOpen', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isAnimated: true })),
          Story.message(Message.RequestedOpen()),
          Story.Command.expectHas(ShowDialog, Animation.WaitForPaint),
          Story.Command.resolveAll(
            [ShowDialog, Message.SucceededShowDialog()],
            [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
            [
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation(),
            ],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.animation.transitionState).toBe('Idle')
          }),
        )
      })

      it('closes with leave animation and CloseDialog on RequestedClose', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isOpen: true, isAnimated: true })),
          Story.message(Message.RequestedClose()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.transitionState).toBe('LeaveStart')
          }),
          Story.Command.resolveAll(
            [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
            [
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation(),
            ],
            [CloseDialog, Message.CompletedCloseDialog()],
          ),
          Story.model(model => {
            expect(model.animation.transitionState).toBe('Idle')
          }),
        )
      })

      it('ignores RequestedClose when already in LeaveStart', () => {
        const leavingModel = evo(
          init({ id: 'test', isOpen: true, isAnimated: true }),
          {
            isOpen: () => false,
            animation: () =>
              evo(Animation.init({ id: 'test-panel', isShowing: false }), {
                transitionState: () => 'LeaveStart',
              }),
          },
        )
        Story.story(
          update,
          Story.given(leavingModel),
          Story.message(Message.RequestedClose()),
          Story.model(model => {
            expect(model).toBe(leavingModel)
          }),
          Story.Command.expectNone(),
        )
      })

      it('dispatches no CloseDialog when the show succeeds during the leave animation', () => {
        const leavingModel = evo(
          init({ id: 'test', isOpen: true, isAnimated: true }),
          {
            isOpen: () => false,
            animation: () =>
              evo(Animation.init({ id: 'test-panel', isShowing: false }), {
                transitionState: () => 'LeaveStart',
              }),
          },
        )
        Story.story(
          update,
          Story.given(leavingModel),
          Story.message(Message.SucceededShowDialog()),
          Story.model(model => {
            expect(model).toBe(leavingModel)
          }),
          Story.Command.expectNone(),
        )
      })

      it('ignores RequestedClose when already in LeaveAnimating', () => {
        const leavingModel = evo(
          init({ id: 'test', isOpen: true, isAnimated: true }),
          {
            isOpen: () => false,
            animation: () =>
              evo(Animation.init({ id: 'test-panel', isShowing: false }), {
                transitionState: () => 'LeaveAnimating',
              }),
          },
        )
        Story.story(
          update,
          Story.given(leavingModel),
          Story.message(Message.RequestedClose()),
          Story.model(model => {
            expect(model).toBe(leavingModel)
          }),
          Story.Command.expectNone(),
        )
      })
    })

    describe('Unmounted', () => {
      it('resets the model to closed and releases resources without emitting Closed', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isOpen: true })),
          Story.message(Message.Unmounted()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
          Story.Command.resolve(
            ReleaseDialogResources,
            Message.CompletedReleaseDialogResources(),
          ),
        )
      })

      it('resets an in-flight leave animation to Idle without emitting Closed', () => {
        const leavingModel = evo(
          init({ id: 'test', isOpen: true, isAnimated: true }),
          {
            isOpen: () => false,
            animation: () =>
              evo(Animation.init({ id: 'test-panel', isShowing: false }), {
                transitionState: () => 'LeaveAnimating',
              }),
          },
        )
        Story.story(
          update,
          Story.given(leavingModel),
          Story.message(Message.Unmounted()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.transitionState).toBe('Idle')
          }),
          Story.Command.resolve(
            ReleaseDialogResources,
            Message.CompletedReleaseDialogResources(),
          ),
        )
      })

      it('is a no-op when the dialog is already closed', () => {
        const closedModel = init({ id: 'test' })
        Story.story(
          update,
          Story.given(closedModel),
          Story.message(Message.Unmounted()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model).toBe(closedModel)
          }),
          Story.Command.expectNone(),
        )
      })

      it('returns the model unchanged on CompletedReleaseDialogResources', () => {
        const originalModel = init({ id: 'test' })
        Story.story(
          update,
          Story.given(originalModel),
          Story.message(Message.CompletedReleaseDialogResources()),
          Story.model(model => {
            expect(model).toBe(originalModel)
          }),
        )
      })
    })

    describe('FailedShowDialog', () => {
      it('closes the model without emitting Closed or releasing resources', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isOpen: true })),
          Story.message(Message.FailedShowDialog()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
          Story.Command.expectNone(),
        )
      })

      it('resets a running enter animation to Idle', () => {
        const enteringModel = evo(
          init({ id: 'test', isOpen: true, isAnimated: true }),
          {
            animation: () =>
              evo(Animation.init({ id: 'test-panel', isShowing: true }), {
                transitionState: () => 'EnterAnimating',
              }),
          },
        )
        Story.story(
          update,
          Story.given(enteringModel),
          Story.message(Message.FailedShowDialog()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        )
      })

      it('resets a running leave animation to Idle', () => {
        const leavingModel = evo(
          init({ id: 'test', isOpen: true, isAnimated: true }),
          {
            isOpen: () => false,
            animation: () =>
              evo(Animation.init({ id: 'test-panel', isShowing: false }), {
                transitionState: () => 'LeaveAnimating',
              }),
          },
        )
        Story.story(
          update,
          Story.given(leavingModel),
          Story.message(Message.FailedShowDialog()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        )
      })

      it('does nothing when the dialog is already closed', () => {
        const closedModel = init({ id: 'test' })
        Story.story(
          update,
          Story.given(closedModel),
          Story.message(Message.FailedShowDialog()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model).toBe(closedModel)
          }),
          Story.Command.expectNone(),
        )
      })

      it('dispatches no CloseDialog when the dialog is closed after a failed show', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isOpen: true })),
          Story.message(Message.FailedShowDialog()),
          Story.message(Message.RequestedClose()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        )
      })
    })
  })

  describe('titleId', () => {
    it('returns the id suffixed with -dialog-title', () => {
      const model = init({ id: 'my-dialog' })
      expect(titleId(model)).toBe('my-dialog-dialog-title')
    })
  })

  describe('descriptionId', () => {
    it('returns the id suffixed with -dialog-description', () => {
      const model = init({ id: 'my-dialog' })
      expect(descriptionId(model)).toBe('my-dialog-dialog-description')
    })
  })

  describe('RenderInfo title and description', () => {
    it('publishes the title id the dialog labels itself by', () => {
      const model = init({ id: 'my-dialog' })
      expect(
        hasIdAttribute(
          renderGroup(model, render => render.title),
          titleId(model),
        ),
      ).toBe(true)
    })

    it('publishes the description id the dialog describes itself by', () => {
      const model = init({ id: 'my-dialog' })
      expect(
        hasIdAttribute(
          renderGroup(model, render => render.description),
          descriptionId(model),
        ),
      ).toBe(true)
    })
  })

  describe('RenderInfo closeButton', () => {
    it('publishes type button so a close control does not submit a form', () => {
      const model = init({ id: 'my-dialog', isOpen: true })
      expect(
        hasButtonType(renderGroup(model, render => render.closeButton)),
      ).toBe(true)
    })

    it('publishes type button while the leave animation runs', () => {
      const leavingModel = evo(
        init({ id: 'my-dialog', isOpen: true, isAnimated: true }),
        {
          isOpen: () => false,
          animation: () =>
            evo(Animation.init({ id: 'my-dialog-panel', isShowing: false }), {
              transitionState: () => 'LeaveStart',
            }),
        },
      )
      expect(
        hasButtonType(renderGroup(leavingModel, render => render.closeButton)),
      ).toBe(true)
    })
  })

  describe('RenderInfo initialFocus', () => {
    it('publishes the marker the dialog focuses on open', () => {
      const model = init({ id: 'my-dialog' })
      expect(
        hasDataAttribute(
          renderGroup(model, render => render.initialFocus),
          initialFocusMarkerAttribute,
        ),
      ).toBe(true)
    })

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
          }).effect

          expect(showDialog).toEqual(Message.FailedShowDialog())
          expect(document.documentElement.style.overflow).not.toBe('hidden')
        }),
    )

    it.effect(
      'ShowDialog releases the scroll lock when it is interrupted before the dialog shows',
      () =>
        Effect.gen(function* () {
          const showDialog = yield* Effect.forkChild(
            ShowDialog({
              id: 'missing-dialog',
              focusSelector: initialFocusMarkerSelector,
            }).effect,
          )

          yield* Effect.yieldNow
          expect(document.documentElement.style.overflow).toBe('hidden')

          yield* Fiber.interrupt(showDialog)

          expect(document.documentElement.style.overflow).not.toBe('hidden')
        }),
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
          }).effect

          expect(showDialog).toEqual(Message.SucceededShowDialog())
          expect(document.documentElement.style.overflow).toBe('hidden')

          dialog.remove()

          const closeDialog = yield* CloseDialog({ id: 'vanishing-dialog' })
            .effect

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

          const closeDialog = yield* CloseDialog({ id: 'phantom-dialog' })
            .effect

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
            }).effect,
          )

          yield* Effect.yieldNow
          yield* CloseDialog({ id: 'racing-dialog' }).effect

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
    it('includes the OnUnmount backstop on the dialog while it is open', () => {
      expect(dialogHasOnUnmount(init({ id: 'test', isOpen: true }))).toBe(true)
    })

    it('omits the OnUnmount backstop while the dialog is closed', () => {
      expect(dialogHasOnUnmount(init({ id: 'test' }))).toBe(false)
    })

    it('renders the dialog closed with no OnUnmount backstop after a failed show', () => {
      const dialogShowFailed = update(
        init({ id: 'test', isOpen: true }),
        Message.FailedShowDialog(),
      )

      expect(
        hasDataAttribute(
          renderGroup(dialogShowFailed.model, render => render.dialog),
          'open',
        ),
      ).toBe(false)
      expect(dialogHasOnUnmount(dialogShowFailed.model)).toBe(false)
    })
  })
})
