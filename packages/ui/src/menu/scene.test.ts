import { Option } from 'effect'
import { type HtmlBuilder, childAttributes } from 'foldkit/html'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import * as Menu from './index.js'

const TestMenu = Menu.create<string>()

const item = (index: number) => Scene.selector(`[key="test-item-${index}"]`)

const openModel = () =>
  Menu.update(
    Menu.init({ id: 'test' }),
    Menu.Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
  ).model

const sceneView = (model: Menu.Model, h: HtmlBuilder<Menu.Message>) =>
  TestMenu.view(
    model,
    {
      items: ['Edit', 'Delete'],
      itemToConfig: (value, context) => ({
        attributes: childAttributes([
          h.DataAttribute('item', value),
          h.Id(`consumer-${value}`),
          h.Role('presentation'),
          ...(context.isActive ? [h.DataAttribute('active', 'consumer')] : []),
          ...(context.isDisabled
            ? [h.AriaDisabled(false), h.DataAttribute('disabled', 'consumer')]
            : []),
        ]),
        content: h.span([], [value]),
      }),
      isItemDisabled: value => value === 'Delete',
      buttonContent: null,
    },
    h,
  )

describe('Menu item attributes', () => {
  it('applies per-item attributes while preserving component-owned attributes', () => {
    Scene.scene(
      { update: Menu.update, view: sceneView },
      Scene.given(openModel()),
      Scene.expect(item(0)).toHaveAttr('data-item', 'Edit'),
      Scene.expect(item(1)).toHaveAttr('data-item', 'Delete'),
      Scene.expect(item(0)).toHaveAttr('id', 'test-item-0'),
      Scene.expect(item(1)).toHaveAttr('id', 'test-item-1'),
      Scene.expect(item(0)).toHaveAttr('role', 'menuitem'),
      Scene.expect(item(1)).toHaveAttr('role', 'menuitem'),
      Scene.expect(item(0)).toHaveAttr('data-active', ''),
      Scene.expect(item(1)).toHaveAttr('aria-disabled', 'true'),
      Scene.expect(item(1)).toHaveAttr('data-disabled', ''),
      Scene.Mount.resolve(Menu.AnchorMenu, Menu.Message.CompletedAnchorMenu()),
      Scene.Mount.resolve(
        Menu.PortalMenuBackdrop,
        Menu.Message.CompletedPortalMenuBackdrop(),
      ),
    )
  })
})
