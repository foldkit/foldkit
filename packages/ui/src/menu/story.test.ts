import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Scene, Story } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import {
  AnchorMenu,
  ClickMenuItem,
  DelayClearMenuSearch,
  DetectMenuMovementOrAnimationEnd,
  FocusMenuButton,
  FocusMenuItems,
  InertMenuOthers,
  type InitConfig,
  LockMenuScroll,
  Message,
  type Model,
  OutMessage,
  PortalMenuBackdrop,
  RestoreMenuInert,
  ScrollMenuItemIntoView,
  UnlockMenuScroll,
  type ViewInputs,
  buttonId,
  groupContiguous,
  makeBlock,
  resolveTypeaheadMatch,
} from './menu.js'

type MenuModel = BlockTypes.Resolved<Model>

const TestMenu = makeBlock()

const RefinedMenu = makeBlock<'Edit' | 'Duplicate' | 'Delete'>()

type SceneOverrides = Pick<
  Partial<ViewInputs<string>>,
  'ariaLabel' | 'ariaLabelledBy'
>

class MenuScene extends Block<MenuScene, SceneOverrides>()('MenuScene', {
  Model: Schema.Struct({ menu: TestMenu }),
}) {}

const MenuSceneLive = MenuScene.make(
  Effect.fn(function* (_id, overrides) {
    const menu = yield* new TestMenu('menu', { id: 'test' })

    return {
      model: { menu },
      view: (model, h) =>
        model.menu.view({
          items: ['Edit', 'Duplicate', 'Delete'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Actions']),
          ...overrides,
        }),
    }
  }),
).pipe(Layer.provide(TestMenu.Live))

class RefinedMenuScene extends Block<RefinedMenuScene>()('RefinedMenuScene', {
  Model: Schema.Struct({ menu: RefinedMenu }),
}) {}

const RefinedMenuSceneLive = RefinedMenuScene.make(
  Effect.fn(function* () {
    const menu = yield* new RefinedMenu('menu', { id: 'test' })

    return {
      model: { menu },
      view: (model, h) =>
        model.menu.view({
          items: ['Edit', 'Duplicate', 'Delete'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Actions']),
        }),
    }
  }),
).pipe(Layer.provide(RefinedMenu.Live))

const button = Scene.selector('#test-button')

const acknowledgeFocusItems = Story.Command.resolve(
  FocusMenuItems,
  Message.CompletedFocusMenuItems(),
)

const completedDetectMenuMovementOrAnimationEnd = (generation: number) =>
  Message.CompletedDetectMenuMovementOrAnimationEnd({ generation })

const STALE_CLEAR_SEARCH_VERSION = 9999

const STALE_ANIMATION_GENERATION = -1

const closed: InitConfig = { id: 'test' }
const animated: InitConfig = { id: 'test', isAnimated: true }
const modal: InitConfig = { id: 'test', isModal: true }

const closedModel: MenuModel = {
  id: 'test',
  isOpen: false,
  isAnimated: false,
  isModal: false,
  animation: {
    id: 'test-items',
    isShowing: false,
    transitionState: 'Idle',
    transitionGeneration: 0,
  },
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  searchQuery: '',
  searchVersion: 0,
  maybeLastPointerPosition: Option.none(),
  maybeLastButtonPointerType: Option.none(),
  maybePointerOrigin: Option.none(),
}

const openModel: MenuModel = modifyFields(closedModel, {
  isOpen: () => true,
  maybeActiveItemIndex: () => Option.some(0),
})

const givenOpen = Story.steps(
  Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
  acknowledgeFocusItems,
)

const givenOpenAnimated = Story.steps(
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
  Story.model((model: MenuModel) => {
    expect(model.animation.transitionState).toBe('Idle')
  }),
)

describe('Menu', () => {
  describe('view', () => {
    it.effect(
      'renders a factory-refined Menu with its own child instances',
      () => Scene.scene(RefinedMenuSceneLive, Scene.expect(button).toExist()),
    )

    it.effect('only points at the items panel while it is rendered', () =>
      Scene.scene(
        MenuSceneLive,
        {},
        Scene.expect(button).not.toHaveAttr('aria-controls'),
        Scene.given({ menu: openModel }),
        Scene.expect(button).toHaveAttr('aria-controls', 'test-items'),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
      ),
    )

    it.effect('keeps the items panel out of the Tab order', () =>
      Scene.scene(
        MenuSceneLive,
        {},
        Scene.given({ menu: openModel }),
        Scene.expect(Scene.selector('#test-items')).toHaveAttr(
          'tabIndex',
          '-1',
        ),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
      ),
    )
  })

  describe('constructor', () => {
    it.effect('defaults to closed with no active item', () =>
      Story.story(
        TestMenu.Live,
        closed,
        Story.model(model => {
          expect(model).toStrictEqual(closedModel)
        }),
      ),
    )

    it.effect('accepts isAnimated option', () =>
      Story.story(
        TestMenu.Live,
        animated,
        Story.model(model => {
          expect(model.isAnimated).toBe(true)
          expect(model.animation.transitionState).toBe('Idle')
        }),
      ),
    )

    it.effect('defaults isModal to false', () =>
      Story.story(
        TestMenu.Live,
        closed,
        Story.model(model => {
          expect(model.isModal).toBe(false)
        }),
      ),
    )

    it.effect('accepts isModal option', () =>
      Story.story(
        TestMenu.Live,
        modal,
        Story.model(model => {
          expect(model.isModal).toBe(true)
        }),
      ),
    )
  })

  describe('button labeling', () => {
    it.effect('no aria-label or aria-labelledby on the button by default', () =>
      Scene.scene(
        MenuSceneLive,
        {},
        Scene.expect(button).not.toHaveAttr('aria-label'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      ),
    )

    it.effect(
      'applies aria-label to the button when ariaLabel is provided',
      () =>
        Scene.scene(
          MenuSceneLive,
          { ariaLabel: 'Actions' },
          Scene.expect(button).toHaveAttr('aria-label', 'Actions'),
          Scene.expect(button).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it.effect(
      'applies aria-labelledby to the button when ariaLabelledBy is provided',
      () =>
        Scene.scene(
          MenuSceneLive,
          { ariaLabelledBy: 'actions-label' },
          Scene.expect(button).toHaveAttr('aria-labelledby', 'actions-label'),
          Scene.expect(button).not.toHaveAttr('aria-label'),
        ),
    )

    it.effect(
      'prefers aria-label over aria-labelledby when both are provided',
      () =>
        Scene.scene(
          MenuSceneLive,
          { ariaLabel: 'Actions', ariaLabelledBy: 'actions-label' },
          Scene.expect(button).toHaveAttr('aria-label', 'Actions'),
          Scene.expect(button).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it('buttonId derives the trigger id from the base id', () => {
      expect(buttonId('test')).toBe('test-button')
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it.effect('opens the menu with the given active item', () =>
        Story.story(
          TestMenu.Live,
          closed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(2) }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        ),
      )

      it.effect('resets search state on open', () =>
        Story.story(
          TestMenu.Live,
          closed,
          Story.given(
            modifyFields(closedModel, {
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
        ),
      )

      it.effect('sets trigger to Keyboard when opened with active item', () =>
        Story.story(
          TestMenu.Live,
          closed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.activationTrigger).toBe('Keyboard')
          }),
        ),
      )

      it.effect('sets trigger to Pointer when opened without active item', () =>
        Story.story(
          TestMenu.Live,
          closed,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('resets pointer position on open', () =>
        Story.story(
          TestMenu.Live,
          closed,
          Story.given(
            modifyFields(closedModel, {
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
        ),
      )
    })

    describe('Closed', () => {
      it.effect('closes the menu and resets state', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect(
        'returns no Command and no OutMessage when already closed',
        () =>
          Story.story(
            TestMenu.Live,
            closed,
            Story.message(Message.Closed()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )
    })

    describe('RequestedClose', () => {
      it.effect('emits Closed when an operation closes the menu', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpen,
          Story.message(Message.RequestedClose()),
          Story.expectOutMessage(OutMessage.Closed()),
          Story.Command.resolve(
            FocusMenuButton,
            Message.CompletedFocusMenuButton(),
          ),
        ),
      )
    })

    describe('BlurredItems', () => {
      it.effect('closes the menu without restoring button focus', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpen,
          Story.message(Message.BlurredItems()),
          Story.expectOutMessage(OutMessage.Closed()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
            expect(model.maybeLastPointerPosition).toStrictEqual(Option.none())
          }),
        ),
      )
    })

    describe('PressedPointerOnButton', () => {
      it.effect('records pointer type for touch without toggling', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('records pointer type for pen without toggling', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('opens the menu on mouse left button when closed', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect(
        'closes the menu on mouse left button when open and preserves pointer type',
        () =>
          Story.story(
            TestMenu.Live,
            closed,
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
          ),
      )

      it.effect('does not toggle on mouse right button', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('always records maybeLastButtonPointerType', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )
    })

    describe('IgnoredMouseClick', () => {
      it.effect('resets maybeLastButtonPointerType', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )
    })

    describe('ClickedButton', () => {
      const mousePress = Message.PressedPointerOnButton({
        pointerType: 'mouse',
        button: 0,
        screenX: 100,
        screenY: 200,
        timeStamp: 1000,
      })

      it.effect(
        'keeps the menu open after the click that follows a mouse press',
        () =>
          Story.story(
            TestMenu.Live,
            closed,
            Story.message(mousePress),
            acknowledgeFocusItems,
            Story.message(Message.ClickedButton()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.maybeLastButtonPointerType).toStrictEqual(
                Option.none(),
              )
            }),
          ),
      )

      it.effect('opens when the click did not follow a mouse press', () =>
        Story.story(
          TestMenu.Live,
          closed,
          Story.message(Message.ClickedButton()),
          acknowledgeFocusItems,
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.activationTrigger).toBe('Pointer')
          }),
        ),
      )

      it.effect(
        'closes an open menu when the click did not follow a mouse press',
        () =>
          Story.story(
            TestMenu.Live,
            closed,
            givenOpen,
            Story.message(Message.ClickedButton()),
            Story.Command.resolve(
              FocusMenuButton,
              Message.CompletedFocusMenuButton(),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )
    })

    describe('ReleasedPointerOnItems', () => {
      const givenOpenAndOrigin = Story.steps(
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

      it.effect('no-ops when no pointer origin', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpen,
          Story.message(
            Message.ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 2000,
            }),
          ),
        ),
      )

      it.effect('no-ops when movement is below threshold', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpenAndOrigin,
          Story.message(
            Message.ReleasedPointerOnItems({
              screenX: 103,
              screenY: 203,
              timeStamp: 2000,
            }),
          ),
        ),
      )

      it.effect('no-ops when hold time is below threshold', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpenAndOrigin,
          Story.message(
            Message.ReleasedPointerOnItems({
              screenX: 200,
              screenY: 300,
              timeStamp: 1100,
            }),
          ),
        ),
      )

      it.effect('no-ops when no active item', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('issues click command when all thresholds met', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )
    })

    describe('ActivatedItem', () => {
      it.effect('sets the active item index', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('replaces the previous active item', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('stores activation trigger in model', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Story.model(model => {
            expect(model.activationTrigger).toBe('Pointer')
          }),
        ),
      )

      it.effect('returns scroll command for keyboard activation', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('returns no commands for pointer activation', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 2, activationTrigger: 'Pointer' }),
          ),
        ),
      )
    })

    describe('DeactivatedItem', () => {
      it.effect('clears active item when pointer-activated', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpen,
          Story.message(
            Message.ActivatedItem({ index: 1, activationTrigger: 'Pointer' }),
          ),
          Story.message(Message.DeactivatedItem()),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('preserves active item when keyboard-activated', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )
    })

    describe('MovedPointerOverItem', () => {
      it.effect('activates item on first pointer move', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('activates when position differs from stored', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('returns model unchanged when position matches', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('does not return scroll commands', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpen,
          Story.message(
            Message.MovedPointerOverItem({
              index: 2,
              screenX: 100,
              screenY: 200,
            }),
          ),
        ),
      )
    })

    describe('SelectedItem', () => {
      it.effect('closes the menu and returns a focus command', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect(
        'returns no Command when an item is selected while already closed',
        () =>
          Story.story(
            TestMenu.Live,
            closed,
            Story.message(Message.SelectedItem({ index: 2, item: 'item-2' })),
            Story.expectOutMessage(
              OutMessage.Selected({ value: 'item-2', index: 2 }),
            ),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )
    })

    describe('RequestedItemClick', () => {
      it.effect('returns model unchanged with a click command', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpen,
          Story.message(Message.RequestedItemClick({ index: 2 })),
          Story.Command.resolve(
            ClickMenuItem,
            Message.CompletedClickMenuItem(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('Searched', () => {
      it.effect('appends the key to the search query', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('bumps the search version', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('updates active item when a match is found', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('keeps existing active item when no match is found', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('returns a delay command for debounce', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )
    })

    describe('CompletedDelayClearMenuSearch', () => {
      it.effect('clears search query when version matches', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )

      it.effect('ignores stale version', () =>
        Story.story(
          TestMenu.Live,
          closed,
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
        ),
      )
    })

    describe('CompletedFocusMenuItems', () => {
      it.effect('returns model unchanged', () =>
        Story.story(
          TestMenu.Live,
          closed,
          givenOpen,
          Story.message(Message.CompletedFocusMenuItems()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('animation', () => {
      describe('enter flow', () => {
        it.effect(
          'sets EnterStart and emits focus + afterPaint on Opened',
          () =>
            Story.story(
              TestMenu.Live,
              animated,
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
            ),
        )

        it.effect(
          'advances EnterStart to EnterAnimating on CompletedWaitForPaint',
          () =>
            Story.story(
              TestMenu.Live,
              animated,
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
            ),
        )

        it.effect('completes EnterAnimating to Idle on EndedAnimation', () =>
          Story.story(
            TestMenu.Live,
            animated,
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
          ),
        )
      })

      describe('leave flow', () => {
        it.effect('starts no leave cascade on Closed when already closed', () =>
          Story.story(
            TestMenu.Live,
            animated,
            Story.message(Message.Closed()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )

        it.effect('sets LeaveStart on Closed', () =>
          Story.story(
            TestMenu.Live,
            animated,
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
          ),
        )

        it.effect(
          'begins the leave animation when the items container blurs',
          () =>
            Story.story(
              TestMenu.Live,
              animated,
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
            ),
        )

        it.effect('sets LeaveStart on SelectedItem', () =>
          Story.story(
            TestMenu.Live,
            animated,
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
          ),
        )

        it.effect(
          'advances LeaveStart to LeaveAnimating on CompletedWaitForPaint',
          () =>
            Story.story(
              TestMenu.Live,
              animated,
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
            ),
        )

        it.effect('completes LeaveAnimating to Idle on EndedAnimation', () =>
          Story.story(
            TestMenu.Live,
            animated,
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
          ),
        )
      })

      describe('non-animated', () => {
        it.effect('keeps transitionState Idle on Opened', () =>
          Story.story(
            TestMenu.Live,
            closed,
            Story.message(
              Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
            ),
            acknowledgeFocusItems,
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )

        it.effect('keeps transitionState Idle on Closed', () =>
          Story.story(
            TestMenu.Live,
            closed,
            givenOpen,
            Story.message(Message.Closed()),
            Story.Command.resolve(
              FocusMenuButton,
              Message.CompletedFocusMenuButton(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )
      })

      describe('stale messages', () => {
        it.effect('ignores CompletedWaitForPaint when Idle', () =>
          Story.story(
            TestMenu.Live,
            closed,
            givenOpen,
            Story.message(
              Block.deliver(
                Animation.Animation,
                'animation',
                Animation.Message.CompletedWaitForPaint({ generation: 0 }),
              ),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )

        it.effect(
          'ignores CompletedDetectMenuMovementOrAnimationEnd when Idle',
          () =>
            Story.story(
              TestMenu.Live,
              closed,
              givenOpen,
              Story.message(completedDetectMenuMovementOrAnimationEnd(0)),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
        )
      })

      describe('interruptions', () => {
        it.effect(
          'transitions to LeaveStart when Closed during EnterStart',
          () =>
            Story.story(
              TestMenu.Live,
              animated,
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
            ),
        )

        it.effect(
          'transitions to LeaveStart when Closed during EnterAnimating',
          () =>
            Story.story(
              TestMenu.Live,
              animated,
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
            ),
        )
      })
    })
  })

  describe('modal commands', () => {
    const givenOpenModal = Story.steps(
      Story.message(Message.Opened({ maybeActiveItemIndex: Option.some(0) })),
      Story.Command.resolveAll(
        [LockMenuScroll, Message.CompletedLockMenuScroll()],
        [InertMenuOthers, Message.CompletedInertMenuOthers()],
        [FocusMenuItems, Message.CompletedFocusMenuItems()],
      ),
    )

    it.effect(
      'emits lockScroll and inertOthers commands on Opened when isModal is true',
      () =>
        Story.story(
          TestMenu.Live,
          modal,
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
          ),
          Story.Command.resolveAll(
            [LockMenuScroll, Message.CompletedLockMenuScroll()],
            [InertMenuOthers, Message.CompletedInertMenuOthers()],
            [FocusMenuItems, Message.CompletedFocusMenuItems()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands on Closed when isModal is true',
      () =>
        Story.story(
          TestMenu.Live,
          modal,
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
        ),
    )

    it.effect(
      'emits no Commands on Closed when already closed in modal mode',
      () =>
        Story.story(
          TestMenu.Live,
          modal,
          Story.message(Message.Closed()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    const openModalModel = modifyFields(closedModel, {
      isModal: () => true,
      isOpen: () => true,
      maybeActiveItemIndex: () => Option.some(1),
      searchQuery: () => 'ed',
      searchVersion: () => 2,
    })

    const expectUnchangedOpenModal = Story.model((model: MenuModel) => {
      expect(model.isOpen).toBe(true)
      expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(1))
      expect(model.searchQuery).toBe('ed')
      expect(model.searchVersion).toBe(2)
    })

    it.effect(
      'emits no Commands when RequestedOpen receives an open modal Model',
      () =>
        Story.story(
          TestMenu.Live,
          modal,
          Story.given(openModalModel),
          Story.message(Message.RequestedOpen()),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
          expectUnchangedOpenModal,
        ),
    )

    it.effect(
      'emits no Commands when Opened receives an open modal Model',
      () =>
        Story.story(
          TestMenu.Live,
          modal,
          Story.given(openModalModel),
          Story.message(
            Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
          expectUnchangedOpenModal,
        ),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands when the items container blurs in modal mode',
      () =>
        Story.story(
          TestMenu.Live,
          modal,
          givenOpenModal,
          Story.message(Message.BlurredItems()),
          Story.Command.resolveAll(
            [UnlockMenuScroll, Message.CompletedUnlockMenuScroll()],
            [RestoreMenuInert, Message.CompletedRestoreMenuInert()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect(
      'emits no Commands when the items container blurs on a closed menu in modal mode',
      () =>
        Story.story(
          TestMenu.Live,
          modal,
          Story.message(Message.BlurredItems()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands on SelectedItem when isModal is true',
      () =>
        Story.story(
          TestMenu.Live,
          modal,
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
        ),
    )

    it.effect('does not emit modal commands when isModal is false', () =>
      Story.story(
        TestMenu.Live,
        closed,
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
      ),
    )
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
})
