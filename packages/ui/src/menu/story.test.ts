import { Effect, Option } from 'effect'
import { Scene, Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { it as baseIt, expect } from 'vitest'

import { describe } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { makeInitialModel } from '../animation/schema.js'
import type { ViewInputs } from './menu.js'
import {
  AnchorMenu,
  AnimationBinding,
  ClickMenuItem,
  DelayClearMenuSearch,
  DetectMenuMovementOrAnimationEnd,
  FocusMenuButton,
  FocusMenuItems,
  InMessage,
  InertMenuOthers,
  LockMenuScroll,
  Message,
  Model,
  OutMessage,
  PortalMenuBackdrop,
  RestoreMenuInert,
  ScrollMenuItemIntoView,
  UnlockMenuScroll,
  block,
  buttonId,
  groupContiguous,
  layer,
  makeBlock,
  resolveTypeaheadMatch,
} from './menu.js'

const RefinedMenu = makeBlock<'Edit' | 'Duplicate' | 'Delete'>()
const button = Scene.selector('#test-button')

const acknowledgeFocusItems = Story.Command.resolve(
  FocusMenuItems,
  Message.CompletedFocusMenuItems(),
)

const completedDetectMenuMovementOrAnimationEnd = (generation: number) =>
  Message.CompletedDetectMenuMovementOrAnimationEnd({ generation })

const STALE_CLEAR_SEARCH_VERSION = 9999

const STALE_ANIMATION_GENERATION = -1

const makeFixture = (menu: Story.TestBlock<typeof block>) => {
  const { init, update, operations } = menu
  const sceneUpdate = update
  const sceneView =
    (
      overrides: Pick<
        Partial<ViewInputs<string>>,
        'ariaLabel' | 'ariaLabelledBy'
      > = {},
    ) =>
    (model: Model, h: Parameters<typeof menu.view>[2]) =>
      menu.view(
        model,
        {
          items: ['Edit', 'Duplicate', 'Delete'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Actions']),
          ...overrides,
        },
        h,
      )
  const openModel = (): Model =>
    update(
      init({ id: 'test' }).model,
      Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
    ).model

  const givenClosed = Story.given(init({ id: 'test' }).model)

  const givenOpen = Story.steps(
    givenClosed,
    Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
    acknowledgeFocusItems,
  )

  const givenClosedAnimated = Story.given(
    init({ id: 'test', isAnimated: true }).model,
  )

  const givenOpenAnimated = Story.steps(
    givenClosedAnimated,
    Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
    acknowledgeFocusItems,
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
    Story.model((model: Model) => {
      expect(model.animation.transitionState).toBe('Idle')
    }),
  )

  const givenClosedModal = Story.given(
    init({ id: 'test', isModal: true }).model,
  )

  const givenOpenModal = Story.steps(
    givenClosedModal,
    Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
    Story.Command.resolveAll(
      [LockMenuScroll, Message.CompletedLockMenuScroll()],
      [InertMenuOthers, Message.CompletedInertMenuOthers()],
      [FocusMenuItems, Message.CompletedFocusMenuItems()],
    ),
  )

  const givenOpenAndOrigin = Story.steps(
    givenClosed,
    Story.message(
      Message.PressedPointerOnButton({
        pointerType: 'mouse',
        button: 0,
        screenX: 100,
        screenY: 200,
        timeStamp: 1000,
      }),
    ),
    acknowledgeFocusItems,
  )

  return {
    init,
    update,
    operations,
    sceneUpdate,
    sceneView,
    openModel,
    givenClosed,
    givenOpen,
    givenClosedAnimated,
    givenOpenAnimated,
    givenClosedModal,
    givenOpenModal,
    givenOpenAndOrigin,
  }
}
const makeRefinedFixture = (menu: Story.TestBlock<typeof RefinedMenu>) => ({
  refinedSceneUpdate: menu.update,
  refinedMenuSceneView: (model: Model, h: Parameters<typeof menu.view>[2]) =>
    menu.view(
      model,
      {
        items: ['Edit', 'Duplicate', 'Delete'],
        itemToConfig: item => ({ content: h.span([], [item]) }),
        buttonContent: h.span([], ['Actions']),
      },
      h,
    ),
})
const it = baseIt.extend<{
  menu: ReturnType<typeof makeFixture>
  refinedMenu: ReturnType<typeof makeRefinedFixture>
}>({
  menu: async ({}, use) =>
    Effect.runPromise(
      Story.withBlock(block, menu =>
        Effect.promise(() => use(makeFixture(menu))),
      ),
    ),
  refinedMenu: async ({}, use) =>
    Effect.runPromise(
      Story.withBlock(RefinedMenu, menu =>
        Effect.promise(() => use(makeRefinedFixture(menu))),
      ).pipe(Effect.provide(layer)),
    ),
})

describe('Menu', () => {
  describe('view', () => {
    it('renders a factory-refined Menu with its own child bindings', ({
      menu: { init },
      refinedMenu: { refinedSceneUpdate, refinedMenuSceneView },
    }) => {
      Scene.scene(
        { update: refinedSceneUpdate, view: refinedMenuSceneView },
        Scene.given(init({ id: 'test' }).model),
        Scene.expect(button).toExist(),
      )
    })

    it('only points at the items panel while it is rendered', ({
      menu: { sceneUpdate, sceneView, init, openModel },
    }) => {
      Scene.scene(
        { update: sceneUpdate, view: sceneView() },
        Scene.given(init({ id: 'test' }).model),
        Scene.expect(button).not.toHaveAttr('aria-controls'),
        Scene.given(openModel()),
        Scene.expect(button).toHaveAttr('aria-controls', 'test-items'),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
      )
    })

    it('keeps the items panel out of the Tab order', ({
      menu: { sceneUpdate, sceneView, openModel },
    }) => {
      Scene.scene(
        { update: sceneUpdate, view: sceneView() },
        Scene.given(openModel()),
        Scene.expect(Scene.selector('#test-items')).toHaveAttr(
          'tabIndex',
          '-1',
        ),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
      )
    })
  })

  describe('init', () => {
    it('defaults to closed with no active item', ({ menu: { init } }) => {
      expect(init({ id: 'test' }).model).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        animation: makeInitialModel({ id: 'test-items' }),
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        searchQuery: '',
        searchVersion: 0,
        maybeLastPointerPosition: Option.none(),
        maybeLastButtonPointerType: Option.none(),
        maybePointerOrigin: Option.none(),
      })
    })

    it('accepts isAnimated option', ({ menu: { init } }) => {
      const model = init({ id: 'test', isAnimated: true }).model
      expect(model.isAnimated).toBe(true)
      expect(model.animation.transitionState).toBe('Idle')
    })

    it('defaults isModal to false', ({ menu: { init } }) => {
      const model = init({ id: 'test' }).model
      expect(model.isModal).toBe(false)
    })

    it('accepts isModal option', ({ menu: { init } }) => {
      const model = init({ id: 'test', isModal: true }).model
      expect(model.isModal).toBe(true)
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens the menu with the given active item', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(2) }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('resets search state on open', ({ menu: { update, init } }) => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }).model, {
              searchQuery: () => 'stale',
              searchVersion: () => 1,
            }),
          ),
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.searchQuery).toBe('')
            expect(model.searchVersion).toBe(0)
          }),
        )
      })

      it('sets trigger to Keyboard when opened with active item', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        )
      })

      it('sets trigger to Pointer when opened without active item', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('resets pointer position on open', ({ menu: { update, init } }) => {
        Story.story(
          update,
          Story.given(
            modifyFields(init({ id: 'test' }).model, {
              maybeLastPointerPosition: () =>
                Option.some({
                  screenX: 100,
                  screenY: 200,
                }),
            }),
          ),
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes the menu and resets state', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.Closed()),
          Story.expectOutMessage(OutMessage.Closed()),
          Story.Command.resolve(
            FocusMenuButton,
            Message.CompletedFocusMenuButton(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.activationTrigger).toBe('Keyboard')
            expect(model.searchQuery).toBe('')
            expect(model.searchVersion).toBe(0)
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
            expect(model.maybePointerOrigin).toStrictEqual(Option.none())
          }),
        )
      })

      it('returns no Command and no OutMessage when already closed', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.Closed()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('RequestedClose', () => {
      it('emits Closed when an operation closes the menu', () => {
        return Effect.runPromise(
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.inMessage(InMessage.RequestedClose()),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.Command.resolve(
              FocusMenuButton,
              Message.CompletedFocusMenuButton(),
            ),
          ),
        )
      })
    })

    describe('BlurredItems', () => {
      it('closes the menu without restoring button focus', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.BlurredItems()),
          Story.expectOutMessage(OutMessage.Closed()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('PressedPointerOnButton', () => {
      it('records pointer type for touch without toggling', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'touch',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
        )
      })

      it('records pointer type for pen without toggling', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'pen',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('pen'),
            )
          }),
        )
      })

      it('opens the menu on mouse left button when closed', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
            expect(model.maybePointerOrigin).toStrictEqual(
              Option.some({ screenX: 100, screenY: 200, timeStamp: 1000 }),
            )
          }),
        )
      })

      it('closes the menu on mouse left button when open and preserves pointer type', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.expectOutMessage(OutMessage.Closed()),
          Story.Command.resolve(
            FocusMenuButton,
            Message.CompletedFocusMenuButton(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
            expect(model.maybePointerOrigin).toStrictEqual(Option.none())
          }),
        )
      })

      it('does not toggle on mouse right button', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 2,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })

      it('always records maybeLastButtonPointerType', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'touch',
              button: 0,
              screenX: 0,
              screenY: 0,
              timeStamp: 0,
            }),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 0,
              screenY: 0,
              timeStamp: 0,
            }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })
    })

    describe('IgnoredMouseClick', () => {
      it('resets maybeLastButtonPointerType', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
              screenX: 100,
              screenY: 200,
              timeStamp: 1000,
            }),
          ),
          Story.Command.resolve(
            FocusMenuButton,
            Message.CompletedFocusMenuButton(),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
          Story.message(Message.IgnoredMouseClick()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })
    })

    describe('ClickedButton', () => {
      const mousePress = Message.PressedPointerOnButton({
        pointerType: 'mouse',
        button: 0,
        screenX: 100,
        screenY: 200,
        timeStamp: 1000,
      })

      it('keeps the menu open after the click that follows a mouse press', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(mousePress),
          acknowledgeFocusItems,
          Story.message(Message.ClickedButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })

      it('opens when the click did not follow a mouse press', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.ClickedButton()),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
          }),
        )
      })

      it('closes an open menu when the click did not follow a mouse press', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.ClickedButton()),
          Story.Command.resolve(
            FocusMenuButton,
            Message.CompletedFocusMenuButton(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('ReleasedPointerOnItems', () => {
      it('no-ops when no pointer origin', ({ menu: { update, givenOpen } }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
        )
      })

      it('no-ops when movement is below threshold', ({
        menu: { update, givenOpenAndOrigin },
      }) => {
        Story.story(
          update,
          givenOpenAndOrigin,
          Story.message(
            Message.ReleasedPointerOnItems({
              screenX: 103,
              screenY: 203,
              timeStamp: 2000,
            }),
          ),
        )
      })

      it('no-ops when hold time is below threshold', ({
        menu: { update, givenOpenAndOrigin },
      }) => {
        Story.story(
          update,
          givenOpenAndOrigin,
          Story.message(
            Message.ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 1100,
            }),
          ),
        )
      })

      it('no-ops when no active item', ({
        menu: { update, givenOpenAndOrigin },
      }) => {
        Story.story(
          update,
          givenOpenAndOrigin,
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
          Story.message(
            Message.ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
        )
      })

      it('issues click command when all thresholds met', ({
        menu: { update, givenOpenAndOrigin },
      }) => {
        Story.story(
          update,
          givenOpenAndOrigin,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
          ),
          Story.message(
            Message.ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
          Story.Command.resolve(
            ClickMenuItem,
            Message.CompletedClickMenuItem(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('ActivatedItem', () => {
      it('sets the active item index', ({ menu: { update, givenOpen } }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 3, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollMenuItemIntoView,
            Message.CompletedScrollMenuItemIntoView(),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('replaces the previous active item', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollMenuItemIntoView,
            Message.CompletedScrollMenuItemIntoView(),
          ),
          Story.message(
            Message.ActivatedItem({ index: 4, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollMenuItemIntoView,
            Message.CompletedScrollMenuItemIntoView(),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(4))
          }),
        )
      })

      it('stores activation trigger in model', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
          }),
        )
      })

      it('returns scroll command for keyboard activation', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollMenuItemIntoView,
            Message.CompletedScrollMenuItemIntoView(),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })

      it('returns no commands for pointer activation', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
          ),
        )
      })
    })

    describe('DeactivatedItem', () => {
      it('clears active item when pointer-activated', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Story.message(Message.DeactivatedItem()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('preserves active item when keyboard-activated', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Keyboard' }),
          ),
          Story.Command.resolve(
            ScrollMenuItemIntoView,
            Message.CompletedScrollMenuItemIntoView(),
          ),
          Story.message(Message.DeactivatedItem()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })

    describe('MovedPointerOverItem', () => {
      it('activates item on first pointer move', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.MovedPointerOverItem({
              index: 2,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeLastPointerPosition).toStrictEqual(
              Option.some({ screenX: 100, screenY: 200 }),
            )
          }),
        )
      })

      it('activates when position differs from stored', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.MovedPointerOverItem({
              index: 1,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.message(
            Message.MovedPointerOverItem({
              index: 3,
              screenX: 150,
              screenY: 250,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
            expect(model.maybeLastPointerPosition).toStrictEqual(
              Option.some({ screenX: 150, screenY: 250 }),
            )
          }),
        )
      })

      it('returns model unchanged when position matches', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.MovedPointerOverItem({
              index: 1,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.message(
            Message.MovedPointerOverItem({
              index: 2,
              screenX: 100,
              screenY: 200,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
          }),
        )
      })

      it('does not return scroll commands', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.MovedPointerOverItem({
              index: 2,
              screenX: 100,
              screenY: 200,
            }),
          ),
        )
      })
    })

    describe('SelectedItem', () => {
      it('closes the menu and returns a focus command', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.SelectedItem({ index: 2, item: 'item-2' })),
          Story.Command.resolve(
            FocusMenuButton,
            Message.CompletedFocusMenuButton(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        )
      })

      it('returns no Command when an item is selected while already closed', ({
        menu: { update, givenClosed },
      }) => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.SelectedItem({ index: 2, item: 'item-2' })),
          Story.expectOutMessage(
            OutMessage.Selected({ value: 'item-2', index: 2 }),
          ),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('RequestedItemClick', () => {
      it('returns model unchanged with a click command', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.RequestedItemClick({ index: 2 })),
          Story.Command.resolve(
            ClickMenuItem,
            Message.CompletedClickMenuItem(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('Searched', () => {
      it('appends the key to the search query', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.Searched({
              key: 'a',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
          Story.message(
            Message.Searched({
              key: 'b',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('ab')
          }),
        )
      })

      it('bumps the search version', ({ menu: { update, givenOpen } }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.Searched({
              key: 'x',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(
            Message.Searched({
              key: 'y',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(2)
          }),
        )
      })

      it('updates active item when a match is found', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.Searched({
              key: 'd',
              maybeTargetIndex: Option.some(3),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(3))
          }),
        )
      })

      it('keeps existing active item when no match is found', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.Searched({
              key: 'z',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(0))
          }),
        )
      })

      it('returns a delay command for debounce', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.Searched({
              key: 'a',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchQuery).toBe('a')
          }),
        )
      })
    })

    describe('CompletedDelayClearMenuSearch', () => {
      it('clears search query when version matches', ({
        menu: { update, givenOpen },
      }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.Searched({
              key: 'a',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(1)
          }),
          Story.message(Message.CompletedDelayClearMenuSearch({ version: 1 })),
          Story.model(model => {
            expect(model.searchQuery).toBe('')
          }),
        )
      })

      it('ignores stale version', ({ menu: { update, givenOpen } }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.Searched({
              key: 'a',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.message(
            Message.Searched({
              key: 'b',
              maybeTargetIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            DelayClearMenuSearch,
            Message.CompletedDelayClearMenuSearch({
              version: STALE_CLEAR_SEARCH_VERSION,
            }),
          ),
          Story.model(model => {
            expect(model.searchVersion).toBe(2)
          }),
          Story.message(Message.CompletedDelayClearMenuSearch({ version: 1 })),
          Story.model(model => {
            expect(model.searchQuery).toBe('ab')
          }),
        )
      })
    })

    describe('CompletedFocusMenuItems', () => {
      it('returns model unchanged', ({ menu: { update, givenOpen } }) => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.CompletedFocusMenuItems()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('animation', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + afterPaint on Opened', ({
          menu: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('EnterStart')
            }),
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
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('advances EnterStart to EnterAnimating on CompletedWaitForPaint', ({
          menu: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({ generation: 1 }),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterAnimating')
            }),
            Story.Command.resolve(
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation({ generation: 1 }),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('completes EnterAnimating to Idle on EndedAnimation', ({
          menu: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            Story.Command.resolveAll(
              [FocusMenuItems, Message.CompletedFocusMenuItems()],
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
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('leave flow', () => {
        it('starts no leave cascade on Closed when already closed', ({
          menu: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Message.Closed()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('sets LeaveStart on Closed', ({
          menu: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.Closed()),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusMenuButton, Message.CompletedFocusMenuButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMenuMovementOrAnimationEnd,
                completedDetectMenuMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('begins the leave animation when the items container blurs', ({
          menu: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.BlurredItems()),
            Story.expectOutMessage(OutMessage.Closed()),
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
                DetectMenuMovementOrAnimationEnd,
                completedDetectMenuMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('sets LeaveStart on SelectedItem', ({
          menu: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.SelectedItem({ index: 0, item: 'item-0' })),
            Story.expectOutMessage(
              OutMessage.Selected({ value: 'item-0', index: 0 }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusMenuButton, Message.CompletedFocusMenuButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMenuMovementOrAnimationEnd,
                completedDetectMenuMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('advances LeaveStart to LeaveAnimating on CompletedWaitForPaint', ({
          menu: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.Closed()),
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({ generation: 2 }),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('LeaveAnimating')
            }),
            Story.Command.expectHas(
              DetectMenuMovementOrAnimationEnd({ id: 'test', generation: 2 }),
            ),
            Story.Command.resolveAll(
              [FocusMenuButton, Message.CompletedFocusMenuButton()],
              [
                DetectMenuMovementOrAnimationEnd,
                completedDetectMenuMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('completes LeaveAnimating to Idle on EndedAnimation', ({
          menu: { update, givenOpenAnimated },
        }) => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.Closed()),
            Story.Command.resolveAll(
              [FocusMenuButton, Message.CompletedFocusMenuButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMenuMovementOrAnimationEnd,
                completedDetectMenuMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', ({
          menu: { update, givenClosed },
        }) => {
          Story.story(
            update,
            givenClosed,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', ({
          menu: { update, givenOpen },
        }) => {
          Story.story(
            update,
            givenOpen,
            Story.message(Message.Closed()),
            Story.Command.resolve(
              FocusMenuButton,
              Message.CompletedFocusMenuButton(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores CompletedWaitForPaint when Idle', () => {
          return Effect.runPromise(
            Story.story(
              block,
              Story.init({ id: 'test' }),
              Story.message(
                Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
              ),
              acknowledgeFocusItems,
              Story.messageFrom(
                AnimationBinding,
                Animation.Message.CompletedWaitForPaint({
                  generation: 0,
                }),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
          )
        })

        it('ignores CompletedDetectMenuMovementOrAnimationEnd when Idle', ({
          menu: { update, givenOpen },
        }) => {
          Story.story(
            update,
            givenOpen,
            Story.message(completedDetectMenuMovementOrAnimationEnd(0)),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', ({
          menu: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({
                generation: STALE_ANIMATION_GENERATION,
              }),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterStart')
            }),
            Story.message(Message.Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusMenuButton, Message.CompletedFocusMenuButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMenuMovementOrAnimationEnd,
                completedDetectMenuMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', ({
          menu: { update, givenClosedAnimated },
        }) => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint({ generation: 1 }),
            ),
            Story.Command.resolve(
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation({
                generation: STALE_ANIMATION_GENERATION,
              }),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterAnimating')
            }),
            Story.message(Message.Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusMenuButton, Message.CompletedFocusMenuButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectMenuMovementOrAnimationEnd,
                completedDetectMenuMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })
    })
  })

  describe('modal commands', () => {
    it('emits lockScroll and inertOthers commands on Opened when isModal is true', ({
      menu: { update, givenClosedModal },
    }) => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
        Story.Command.resolveAll(
          [LockMenuScroll, Message.CompletedLockMenuScroll()],
          [InertMenuOthers, Message.CompletedInertMenuOthers()],
          [FocusMenuItems, Message.CompletedFocusMenuItems()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', ({
      menu: { update, givenOpenModal },
    }) => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Message.Closed()),
        Story.Command.resolveAll(
          [FocusMenuButton, Message.CompletedFocusMenuButton()],
          [UnlockMenuScroll, Message.CompletedUnlockMenuScroll()],
          [RestoreMenuInert, Message.CompletedRestoreMenuInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands on Closed when already closed in modal mode', ({
      menu: { update, givenClosedModal },
    }) => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.Closed()),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands when requestOpen receives an open modal Model', ({
      menu: { init, operations, update },
    }) => {
      const openModal = modifyFields(
        init({ id: 'test', isModal: true }).model,
        {
          isOpen: () => true,
          maybeActiveItemIndex: () => Option.some(1),
          searchQuery: () => 'ed',
          searchVersion: () => 2,
        },
      )

      for (const reopened of [
        operations.requestOpen(openModal),
        update(
          openModal,
          Message.Opened({ maybeActiveItemIndex: Option.none() }),
        ),
      ]) {
        expect(reopened.commands ?? []).toEqual([])
        expect(reopened.outMessage).toBeUndefined()
        expect(reopened.model.isOpen).toBe(true)
        expect(reopened.model.maybeActiveItemIndex).toStrictEqual(
          Option.some(1),
        )
        expect(reopened.model.searchQuery).toBe('ed')
        expect(reopened.model.searchVersion).toBe(2)
      }
    })

    it('emits unlockScroll and restoreInert commands when the items container blurs in modal mode', ({
      menu: { update, givenOpenModal },
    }) => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Message.BlurredItems()),
        Story.Command.resolveAll(
          [UnlockMenuScroll, Message.CompletedUnlockMenuScroll()],
          [RestoreMenuInert, Message.CompletedRestoreMenuInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands when the items container blurs on a closed menu in modal mode', ({
      menu: { update, givenClosedModal },
    }) => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.BlurredItems()),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on SelectedItem when isModal is true', ({
      menu: { update, givenOpenModal },
    }) => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Message.SelectedItem({ index: 0, item: 'item-0' })),
        Story.Command.resolveAll(
          [FocusMenuButton, Message.CompletedFocusMenuButton()],
          [UnlockMenuScroll, Message.CompletedUnlockMenuScroll()],
          [RestoreMenuInert, Message.CompletedRestoreMenuInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not emit modal commands when isModal is false', ({
      menu: { update, givenClosed },
    }) => {
      Story.story(
        update,
        givenClosed,
        Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
        acknowledgeFocusItems,
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Message.Closed()),
        Story.Command.resolve(
          FocusMenuButton,
          Message.CompletedFocusMenuButton(),
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })
  })

  describe('resolveTypeaheadMatch', () => {
    const items: ReadonlyArray<string> = [
      'Edit',
      'Duplicate',
      'Archive',
      'Move',
      'Delete',
    ]
    const noneDisabled = () => false
    const identity = (item: string) => item

    it('finds item matching the query', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'a',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(2))
    })

    it('matches case-insensitively', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'A',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(2))
    })

    it('starts searching after the active item on fresh search', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'd',
          Option.some(1),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('wraps around when no match after active item', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'e',
          Option.some(3),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(0))
    })

    it('returns none when no item matches', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'z',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.none())
    })

    it('skips disabled items', () => {
      const archiveDisabled = (index: number) => index === 2
      expect(
        resolveTypeaheadMatch(
          items,
          'a',
          Option.none(),
          archiveDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.none())
    })

    it('matches multi-character queries', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'de',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('uses the itemToSearchText function', () => {
      const withLabels = (item: string) => `Action: ${item}`
      expect(
        resolveTypeaheadMatch(
          items,
          'action: m',
          Option.none(),
          noneDisabled,
          withLabels,
          false,
        ),
      ).toStrictEqual(Option.some(3))
    })

    it('starts from index 0 when no active item', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'e',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(0))
    })

    it('finds the next match when wrapping on fresh search', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'du',
          Option.some(0),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(1))
    })

    it('includes the active item on refinement', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'del',
          Option.some(4),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('skips the active item on fresh search', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'd',
          Option.some(1),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('finds next match on refinement when active item no longer matches', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'du',
          Option.some(4),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(1))
    })

    it('matches queries containing spaces', () => {
      const multiWordItems: ReadonlyArray<string> = [
        'Copy Link',
        'Danger Zone',
        'Dark Mode',
        'Delete All',
      ]
      expect(
        resolveTypeaheadMatch(
          multiWordItems,
          'danger z',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(1))
    })

    it('distinguishes multi-word items by space in query', () => {
      const multiWordItems: ReadonlyArray<string> = [
        'Copy Link',
        'Danger Zone',
        'Dark Mode',
        'Delete All',
      ]
      expect(
        resolveTypeaheadMatch(
          multiWordItems,
          'da',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(1))

      expect(
        resolveTypeaheadMatch(
          multiWordItems,
          'danger ',
          Option.none(),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(1))

      expect(
        resolveTypeaheadMatch(
          multiWordItems,
          'dark',
          Option.none(),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(2))
    })
  })

  describe('groupContiguous', () => {
    const identity = (item: string) => item

    it('returns empty for empty input', () => {
      expect(groupContiguous([], identity)).toStrictEqual([])
    })

    it('groups a single item', () => {
      expect(groupContiguous(['a'], identity)).toStrictEqual([
        { key: 'a', items: ['a'] },
      ])
    })

    it('groups contiguous items with the same key', () => {
      expect(groupContiguous(['a', 'a', 'a'], identity)).toStrictEqual([
        { key: 'a', items: ['a', 'a', 'a'] },
      ])
    })

    it('separates items with different keys', () => {
      expect(groupContiguous(['a', 'b'], identity)).toStrictEqual([
        { key: 'a', items: ['a'] },
        { key: 'b', items: ['b'] },
      ])
    })

    it('keeps non-contiguous runs as separate segments', () => {
      expect(groupContiguous(['a', 'b', 'a'], identity)).toStrictEqual([
        { key: 'a', items: ['a'] },
        { key: 'b', items: ['b'] },
        { key: 'a', items: ['a'] },
      ])
    })

    it('uses the key function to determine grouping', () => {
      const items = ['Edit', 'Duplicate', 'Archive', 'Move', 'Delete']
      const toGroup = (item: string) =>
        item === 'Delete' ? 'Danger' : 'Actions'

      expect(groupContiguous(items, toGroup)).toStrictEqual([
        { key: 'Actions', items: ['Edit', 'Duplicate', 'Archive', 'Move'] },
        { key: 'Danger', items: ['Delete'] },
      ])
    })

    it('passes index to the key function', () => {
      const items = ['a', 'b', 'c', 'd']
      const byHalf = (_item: string, index: number) =>
        index < 2 ? 'first' : 'second'

      expect(groupContiguous(items, byHalf)).toStrictEqual([
        { key: 'first', items: ['a', 'b'] },
        { key: 'second', items: ['c', 'd'] },
      ])
    })
  })

  describe('button labeling', () => {
    it('no aria-label or aria-labelledby on the button by default', ({
      menu: { sceneUpdate, sceneView, init },
    }) => {
      Scene.scene(
        { update: sceneUpdate, view: sceneView() },
        Scene.given(init({ id: 'test' }).model),
        Scene.expect(button).not.toHaveAttr('aria-label'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('applies aria-label to the button when ariaLabel is provided', ({
      menu: { sceneUpdate, sceneView, init },
    }) => {
      Scene.scene(
        { update: sceneUpdate, view: sceneView({ ariaLabel: 'Actions' }) },
        Scene.given(init({ id: 'test' }).model),
        Scene.expect(button).toHaveAttr('aria-label', 'Actions'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('applies aria-labelledby to the button when ariaLabelledBy is provided', ({
      menu: { sceneUpdate, sceneView, init },
    }) => {
      Scene.scene(
        {
          update: sceneUpdate,
          view: sceneView({ ariaLabelledBy: 'actions-label' }),
        },
        Scene.given(init({ id: 'test' }).model),
        Scene.expect(button).toHaveAttr('aria-labelledby', 'actions-label'),
        Scene.expect(button).not.toHaveAttr('aria-label'),
      )
    })

    it('prefers aria-label over aria-labelledby when both are provided', ({
      menu: { sceneUpdate, sceneView, init },
    }) => {
      Scene.scene(
        {
          update: sceneUpdate,
          view: sceneView({
            ariaLabel: 'Actions',
            ariaLabelledBy: 'actions-label',
          }),
        },
        Scene.given(init({ id: 'test' }).model),
        Scene.expect(button).toHaveAttr('aria-label', 'Actions'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('buttonId derives the trigger id from the base id', () => {
      expect(buttonId('test')).toBe('test-button')
    })
  })
})
