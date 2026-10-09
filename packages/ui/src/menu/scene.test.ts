import { Option } from 'effect'
import { Scene } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import type { Model, ViewInputs } from './index.js'
import {
  AnchorMenu,
  AnchorSubmenu,
  Message,
  PortalMenuBackdrop,
  PortalSubmenuLayer,
  ScrollPathItemIntoView,
  buttonId,
  create,
  init,
  submenu,
  update,
} from './index.js'

const TestMenu = create<string>()

const sceneView =
  (
    overrides: Pick<
      Partial<ViewInputs<string>>,
      'ariaLabel' | 'ariaLabelledBy'
    > = {},
  ) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    TestMenu.view(
      model,
      {
        items: ['Edit', 'Duplicate', 'Delete'],
        itemToConfig: item => ({ content: h.span([], [item]) }),
        buttonContent: h.span([], ['Actions']),
        ...overrides,
      },
      h,
    )

const button = Scene.selector('#test-button')

const nestedSceneView = (model: Model, h: HtmlBuilder<Message>) =>
  TestMenu.view(
    model,
    {
      items: [
        submenu<string>({
          id: 'current-export',
          label: 'Export',
          items: ['ExportPdf'],
        }),
      ],
      itemToConfig: item => ({ content: h.span([], [item]) }),
      buttonContent: h.span([], ['Actions']),
    },
    h,
  )

const emptyNestedSceneView = (model: Model, h: HtmlBuilder<Message>) =>
  TestMenu.view(
    model,
    {
      items: [submenu<string>({ id: 'empty', label: 'Empty', items: [] })],
      itemToConfig: item => ({ content: h.span([], [item]) }),
      buttonContent: h.span([], ['Actions']),
    },
    h,
  )

const openModel = (): Model =>
  update(
    init({ id: 'test' }),
    Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
  ).model

describe('Menu', () => {
  describe('view', () => {
    it('does not render a stale branch after its stable submenu id changes', () => {
      const staleOpenModel = update(
        openModel(),
        Message.OpenedSubmenu({
          indexPath: [0],
          submenuPath: ['removed-export'],
          maybeActiveItemIndex: Option.some(0),
        }),
      ).model

      Scene.scene(
        { update, view: nestedSceneView },
        Scene.given(staleOpenModel),
        Scene.expect(Scene.selector('#test-submenu-0')).not.toExist(),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
        Scene.Mount.resolve(
          PortalSubmenuLayer,
          Message.CompletedPortalSubmenuLayer(),
        ),
      )
    })

    it('only points at the items panel while it is rendered', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(init({ id: 'test' })),
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

    it('keeps the items panel out of the Tab order', () => {
      Scene.scene(
        { update, view: sceneView() },
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

    it('leaves modified printable shortcuts to the browser in a flat menu', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(openModel()),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
        Scene.keydown(Scene.selector('#test-items'), 'D', { ctrlKey: true }),
        Scene.expectIgnored(),
        Scene.expect(Scene.selector('#test-item-0')).toHaveAttr('data-active'),
        Scene.expect(Scene.selector('#test-item-2')).not.toHaveAttr(
          'data-active',
        ),
      )
    })

    it('labels a submenu trigger from its declared label', () => {
      Scene.scene(
        { update, view: nestedSceneView },
        Scene.given(openModel()),
        Scene.expect(Scene.selector('#test-items-item-0')).toHaveAttr(
          'aria-label',
          'Export',
        ),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
        Scene.Mount.resolve(
          PortalSubmenuLayer,
          Message.CompletedPortalSubmenuLayer(),
        ),
      )
    })

    it('omits an active descendant when an open child has no items', () => {
      const emptyChildOpen = update(
        openModel(),
        Message.OpenedSubmenu({
          indexPath: [0],
          submenuPath: ['empty'],
          maybeActiveItemIndex: Option.some(2),
        }),
      ).model

      Scene.scene(
        { update, view: emptyNestedSceneView },
        Scene.given(emptyChildOpen),
        Scene.expect(Scene.selector('#test-items')).not.toHaveAttr(
          'aria-activedescendant',
        ),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
        Scene.Mount.resolve(
          PortalSubmenuLayer,
          Message.CompletedPortalSubmenuLayer(),
        ),
        Scene.Mount.resolve(AnchorSubmenu, Message.CompletedAnchorSubmenu()),
      )
    })

    it('keeps duplicate leaf actions distinct around a submenu', () => {
      const view = (model: Model, h: HtmlBuilder<Message>) =>
        TestMenu.view(
          model,
          {
            items: [
              'Delete',
              submenu<string>({
                id: 'move',
                label: 'Move',
                items: ['Archive'],
              }),
              'Delete',
            ],
            itemToConfig: item => ({ content: h.span([], [item]) }),
            buttonContent: h.span([], ['Actions']),
          },
          h,
        )

      Scene.scene(
        { update, view },
        Scene.given(openModel()),
        Scene.expect(Scene.selector('#test-items-item-0')).toHaveText('Delete'),
        Scene.expect(Scene.selector('#test-items-item-2')).toHaveText('Delete'),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
        Scene.Mount.resolve(
          PortalSubmenuLayer,
          Message.CompletedPortalSubmenuLayer(),
        ),
        Scene.keydown(Scene.selector('#test-items'), 'End'),
        Scene.Command.resolve(
          ScrollPathItemIntoView,
          Message.CompletedScrollPathItemIntoView(),
        ),
        Scene.expect(Scene.selector('#test-items-item-0')).not.toHaveAttr(
          'data-active',
        ),
        Scene.expect(Scene.selector('#test-items-item-2')).toHaveAttr(
          'data-active',
        ),
      )
    })

    it('only sends leaf group keys to the heading callback', () => {
      const view = (model: Model, h: HtmlBuilder<Message>) =>
        TestMenu.view(
          model,
          {
            items: [
              'Edit',
              submenu<string>({
                id: 'move',
                label: 'Move',
                items: ['Archive'],
              }),
              'Delete',
            ],
            itemToConfig: item => ({ content: h.span([], [item]) }),
            itemGroupKey: () => 'actions',
            groupToHeading: key => {
              expect(key).toBe('actions')
              return { content: h.span([], ['Actions group']) }
            },
            buttonContent: h.span([], ['Actions']),
          },
          h,
        )

      Scene.scene(
        { update, view },
        Scene.given(openModel()),
        Scene.expect(Scene.selector('#test-items-item-1')).toHaveAttr(
          'aria-label',
          'Move',
        ),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
        Scene.Mount.resolve(
          PortalSubmenuLayer,
          Message.CompletedPortalSubmenuLayer(),
        ),
      )
    })

    it('does not activate an item in an empty child level', () => {
      const emptyChildOpen = update(
        openModel(),
        Message.OpenedSubmenu({
          indexPath: [0],
          submenuPath: ['empty'],
          maybeActiveItemIndex: Option.none(),
        }),
      ).model

      Scene.scene(
        { update, view: emptyNestedSceneView },
        Scene.given(emptyChildOpen),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
        Scene.Mount.resolve(
          PortalSubmenuLayer,
          Message.CompletedPortalSubmenuLayer(),
        ),
        Scene.Mount.resolve(AnchorSubmenu, Message.CompletedAnchorSubmenu()),
        Scene.keydown(Scene.selector('#test-items'), 'ArrowDown'),
        Scene.expectIgnored(),
        Scene.expect(Scene.selector('#test-items')).not.toHaveAttr(
          'aria-activedescendant',
        ),
      )
    })

    it('does not activate disabled entries in a child level', () => {
      const view = (model: Model, h: HtmlBuilder<Message>) =>
        TestMenu.view(
          model,
          {
            items: [
              submenu<string>({
                id: 'unavailable',
                label: 'Unavailable',
                items: [
                  'Export',
                  submenu<string>({
                    id: 'share',
                    label: 'Share',
                    items: ['CopyLink'],
                    isDisabled: true,
                  }),
                ],
              }),
            ],
            itemToConfig: item => ({ content: h.span([], [item]) }),
            isItemDisabled: () => true,
            buttonContent: h.span([], ['Actions']),
          },
          h,
        )
      const childOpen = update(
        openModel(),
        Message.OpenedSubmenu({
          indexPath: [0],
          submenuPath: ['unavailable'],
          maybeActiveItemIndex: Option.none(),
        }),
      ).model

      Scene.scene(
        { update, view },
        Scene.given(childOpen),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
        Scene.Mount.resolve(
          PortalSubmenuLayer,
          Message.CompletedPortalSubmenuLayer(),
        ),
        Scene.Mount.resolve(AnchorSubmenu, Message.CompletedAnchorSubmenu()),
        Scene.keydown(Scene.selector('#test-items'), 'ArrowDown'),
        Scene.expectIgnored(),
        Scene.expect(Scene.selector('#test-items')).not.toHaveAttr(
          'aria-activedescendant',
        ),
      )
    })

    it('starts ArrowDown at the first item after a pointer open', () => {
      const view = (model: Model, h: HtmlBuilder<Message>) =>
        TestMenu.view(
          model,
          {
            items: [
              'Rename',
              submenu<string>({
                id: 'organize',
                label: 'Organize',
                items: ['Archive'],
              }),
            ],
            itemToConfig: item => ({ content: h.span([], [item]) }),
            buttonContent: h.span([], ['Actions']),
          },
          h,
        )
      const pointerOpen = update(
        init({ id: 'test' }),
        Message.Opened({ maybeActiveItemIndex: Option.none() }),
      ).model

      Scene.scene(
        { update, view },
        Scene.given(pointerOpen),
        Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu()),
        Scene.Mount.resolve(
          PortalMenuBackdrop,
          Message.CompletedPortalMenuBackdrop(),
        ),
        Scene.Mount.resolve(
          PortalSubmenuLayer,
          Message.CompletedPortalSubmenuLayer(),
        ),
        Scene.keydown(Scene.selector('#test-items'), 'ArrowDown'),
        Scene.Command.resolve(
          ScrollPathItemIntoView,
          Message.CompletedScrollPathItemIntoView(),
        ),
        Scene.expect(Scene.selector('#test-items-item-0')).toHaveAttr(
          'data-active',
        ),
        Scene.expect(Scene.selector('#test-items-item-1')).not.toHaveAttr(
          'data-active',
        ),
      )
    })
  })

  describe('button labeling', () => {
    it('no aria-label or aria-labelledby on the button by default', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(init({ id: 'test' })),
        Scene.expect(button).not.toHaveAttr('aria-label'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('applies aria-label to the button when ariaLabel is provided', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabel: 'Actions' }) },
        Scene.given(init({ id: 'test' })),
        Scene.expect(button).toHaveAttr('aria-label', 'Actions'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('applies aria-labelledby to the button when ariaLabelledBy is provided', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabelledBy: 'actions-label' }) },
        Scene.given(init({ id: 'test' })),
        Scene.expect(button).toHaveAttr('aria-labelledby', 'actions-label'),
        Scene.expect(button).not.toHaveAttr('aria-label'),
      )
    })

    it('prefers aria-label over aria-labelledby when both are provided', () => {
      Scene.scene(
        {
          update,
          view: sceneView({
            ariaLabel: 'Actions',
            ariaLabelledBy: 'actions-label',
          }),
        },
        Scene.given(init({ id: 'test' })),
        Scene.expect(button).toHaveAttr('aria-label', 'Actions'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('buttonId derives the trigger id from the base id', () => {
      expect(buttonId('test')).toBe('test-button')
    })
  })
})
