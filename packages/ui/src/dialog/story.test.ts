import { Effect, Option, Predicate } from 'effect'
import * as Dom from 'foldkit/dom'
import { type ChildAttribute, html } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import {
  CloseDialog,
  Closed,
  CompletedCloseDialog,
  CompletedReleaseDialogResources,
  CompletedShowDialog,
  type Message,
  type Model,
  Opened,
  ReleaseDialogResources,
  type RenderInfo,
  RequestedClose,
  RequestedOpen,
  ShowDialog,
  Unmounted,
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
  const sceneView = (currentModel: Model) =>
    view(currentModel, {
      toView: ({ dialog }) => {
        hasOnUnmount = dialog.some(isOnUnmount)
        return html<Message>().dialog([...dialog], [])
      },
    })

  Scene.scene({ update, view: sceneView }, Scene.with(model))
  return hasOnUnmount
}

// Renders the dialog view through the Scene harness and returns the chosen
// RenderInfo attribute group so a test can inspect what the consumer receives.
const renderGroup = (
  model: Model,
  selectGroup: (render: RenderInfo) => ReadonlyArray<ChildAttribute>,
): ReadonlyArray<ChildAttribute> => {
  let captured: ReadonlyArray<ChildAttribute> = []
  const sceneView = (currentModel: Model) =>
    view(currentModel, {
      toView: render => {
        captured = selectGroup(render)
        return html<Message>().dialog([...render.dialog], [])
      },
    })

  Scene.scene({ update, view: sceneView }, Scene.with(model))
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
          Story.with(init({ id: 'test' })),
          Story.message(RequestedOpen()),
          Story.expectOutMessage(Opened()),
          Story.Command.resolve(ShowDialog, CompletedShowDialog()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('shows with the initialFocus marker selector when no focusSelector is configured', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(RequestedOpen()),
          Story.Command.resolve(
            ShowDialog({
              id: 'test',
              focusSelector: initialFocusMarkerSelector,
            }),
            CompletedShowDialog(),
          ),
        )
      })

      it('shows with the configured focusSelector, which wins over the marker', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', focusSelector: '#search-input' })),
          Story.message(RequestedOpen()),
          Story.Command.resolve(
            ShowDialog({ id: 'test', focusSelector: '#search-input' }),
            CompletedShowDialog(),
          ),
        )
      })

      it('opens without command or OutMessage when already open on RequestedOpen', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isOpen: true })),
          Story.message(RequestedOpen()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('closes when open on RequestedClose and emits Closed', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isOpen: true })),
          Story.message(RequestedClose()),
          Story.expectOutMessage(Closed()),
          Story.Command.resolve(CloseDialog, CompletedCloseDialog()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('closes without command or OutMessage when already closed on RequestedClose', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test' })),
          Story.message(RequestedClose()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('returns model unchanged on CompletedShowDialog', () => {
        const originalModel = init({ id: 'test' })
        Story.story(
          update,
          Story.with(originalModel),
          Story.message(CompletedShowDialog()),
          Story.model(model => {
            expect(model).toBe(originalModel)
          }),
        )
      })
    })

    describe('animated', () => {
      it('opens with enter animation on RequestedOpen', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', isAnimated: true })),
          Story.message(RequestedOpen()),
          Story.Command.expectHas(ShowDialog, Animation.RequestFrame),
          Story.Command.resolveAll(
            [ShowDialog, CompletedShowDialog()],
            [Animation.RequestFrame, Animation.AdvancedAnimationFrame()],
            [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
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
          Story.with(init({ id: 'test', isOpen: true, isAnimated: true })),
          Story.message(RequestedClose()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.transitionState).toBe('LeaveStart')
          }),
          Story.Command.resolveAll(
            [Animation.RequestFrame, Animation.AdvancedAnimationFrame()],
            [Animation.WaitForAnimationSettled, Animation.EndedAnimation()],
            [CloseDialog, CompletedCloseDialog()],
          ),
          Story.model(model => {
            expect(model.animation.transitionState).toBe('Idle')
          }),
        )
      })

      it('ignores RequestedClose when already in LeaveStart', () => {
        const leavingModel = {
          ...init({ id: 'test', isOpen: true, isAnimated: true }),
          isOpen: false,
          animation: {
            id: 'test-panel',
            isShowing: false,
            transitionState: 'LeaveStart' as const,
          },
        }
        Story.story(
          update,
          Story.with(leavingModel),
          Story.message(RequestedClose()),
          Story.model(model => {
            expect(model).toBe(leavingModel)
          }),
          Story.Command.expectNone(),
        )
      })

      it('ignores RequestedClose when already in LeaveAnimating', () => {
        const leavingModel = {
          ...init({ id: 'test', isOpen: true, isAnimated: true }),
          isOpen: false,
          animation: {
            id: 'test-panel',
            isShowing: false,
            transitionState: 'LeaveAnimating' as const,
          },
        }
        Story.story(
          update,
          Story.with(leavingModel),
          Story.message(RequestedClose()),
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
          Story.with(init({ id: 'test', isOpen: true })),
          Story.message(Unmounted()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
          Story.Command.resolve(
            ReleaseDialogResources,
            CompletedReleaseDialogResources(),
          ),
        )
      })

      it('resets an in-flight leave animation to Idle without emitting Closed', () => {
        const leavingModel = {
          ...init({ id: 'test', isOpen: true, isAnimated: true }),
          isOpen: false,
          animation: {
            id: 'test-panel',
            isShowing: false,
            transitionState: 'LeaveAnimating' as const,
          },
        }
        Story.story(
          update,
          Story.with(leavingModel),
          Story.message(Unmounted()),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.animation.transitionState).toBe('Idle')
          }),
          Story.Command.resolve(
            ReleaseDialogResources,
            CompletedReleaseDialogResources(),
          ),
        )
      })

      it('is a no-op when the dialog is already closed', () => {
        const closedModel = init({ id: 'test' })
        Story.story(
          update,
          Story.with(closedModel),
          Story.message(Unmounted()),
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
          Story.with(originalModel),
          Story.message(CompletedReleaseDialogResources()),
          Story.model(model => {
            expect(model).toBe(originalModel)
          }),
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

  describe('view OnUnmount gating', () => {
    it('includes the OnUnmount backstop on the dialog while it is open', () => {
      expect(dialogHasOnUnmount(init({ id: 'test', isOpen: true }))).toBe(true)
    })

    it('omits the OnUnmount backstop while the dialog is closed', () => {
      expect(dialogHasOnUnmount(init({ id: 'test' }))).toBe(false)
    })
  })
})
