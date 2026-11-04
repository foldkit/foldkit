import { Effect } from 'effect'
import type * as Block from 'foldkit/block'
import type * as Mount from 'foldkit/mount'
import * as Story from 'foldkit/story'
import { expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import {
  AcquireResources,
  CloseDialog,
  ReleaseDialogResources,
  ShowDialog,
} from './dialog/block.js'
import * as Dialog from './dialog/public.js'
import * as Listbox from './listbox/public.js'
import {
  AnchorListbox,
  FocusListboxButton,
  FocusListboxItems,
  PortalListboxBackdrop,
} from './listbox/shared.js'
import {
  AnchorMenu,
  ClickMenuItem,
  DelayClearMenuSearch,
  DetectMenuMovementOrAnimationEnd,
  FocusMenuButton,
  FocusMenuItems,
  InertMenuOthers,
  LockMenuScroll,
  PortalMenuBackdrop,
  RestoreMenuInert,
  ScrollMenuItemIntoView,
  UnlockMenuScroll,
} from './menu/menu.js'
import * as Menu from './menu/public.js'
import { AnchorPopover } from './popover/block.js'
import * as Popover from './popover/public.js'
import * as RadioGroup from './radioGroup/public.js'
import { FocusOption } from './radioGroup/radioGroup.js'
import * as Tabs from './tabs/public.js'
import { FocusTab } from './tabs/tabs.js'

const TestMenu = Menu.makeBlock()

it.effect(
  'publishes the original Command and Mount Definitions through test namespaces',
  () =>
    Story.withBlock(TestMenu, menu => {
      expect(Dialog.test.AcquireResources).toBe(AcquireResources)
      expect(Dialog.test.CloseDialog).toBe(CloseDialog)
      expect(Dialog.test.ReleaseDialogResources).toBe(ReleaseDialogResources)
      expect(Dialog.test.ShowDialog).toBe(ShowDialog)
      expect(Listbox.test.FocusListboxButton).toBe(FocusListboxButton)
      expect(Listbox.test.FocusListboxItems).toBe(FocusListboxItems)
      expect(Listbox.test.AnchorListbox).toBe(AnchorListbox)
      expect(Listbox.test.PortalListboxBackdrop).toBe(PortalListboxBackdrop)
      expect(Menu.test.LockMenuScroll).toBe(LockMenuScroll)
      expect(Menu.test.UnlockMenuScroll).toBe(UnlockMenuScroll)
      expect(Menu.test.InertMenuOthers).toBe(InertMenuOthers)
      expect(Menu.test.RestoreMenuInert).toBe(RestoreMenuInert)
      expect(Menu.test.FocusMenuButton).toBe(FocusMenuButton)
      expect(Menu.test.FocusMenuItems).toBe(FocusMenuItems)
      expect(Menu.test.ScrollMenuItemIntoView).toBe(ScrollMenuItemIntoView)
      expect(Menu.test.ClickMenuItem).toBe(ClickMenuItem)
      expect(Menu.test.DelayClearMenuSearch).toBe(DelayClearMenuSearch)
      expect(Menu.test.DetectMenuMovementOrAnimationEnd).toBe(
        DetectMenuMovementOrAnimationEnd,
      )
      expect(Menu.test.AnchorMenu).toBe(AnchorMenu)
      expect(Menu.test.PortalMenuBackdrop).toBe(PortalMenuBackdrop)
      expect(TestMenu.makeMount).toBeTypeOf('function')
      expect(menu).not.toHaveProperty('mounts')
      expectTypeOf<
        Block.FactsOf<typeof TestMenu>['mountRequirements']
      >().toEqualTypeOf<
        Mount.RequirementsOf<
          readonly [typeof AnchorMenu, typeof PortalMenuBackdrop]
        >
      >()
      expect(Popover.test.AnchorPopover).toBe(AnchorPopover)
      expect(RadioGroup.test.FocusOption).toBe(FocusOption)
      expect(Tabs.test.FocusTab).toBe(FocusTab)
    }).pipe(Effect.provide(Menu.layer)),
)
