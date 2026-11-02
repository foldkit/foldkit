import { Layer } from 'effect'

import * as UI from '@foldkit/ui'
import * as Animation from '@foldkit/ui/animation'
import * as Calendar from '@foldkit/ui/calendar'
import * as Combobox from '@foldkit/ui/combobox'
import * as DragAndDrop from '@foldkit/ui/dragAndDrop'
import * as HoverIntent from '@foldkit/ui/hoverIntent'
import * as Listbox from '@foldkit/ui/listbox'
import * as Popover from '@foldkit/ui/popover'
import * as Tooltip from '@foldkit/ui/tooltip'
import * as VirtualList from '@foldkit/ui/virtualList'

export type RootAnimationTest = typeof UI.Animation.test
export type RootCalendarTest = typeof UI.Calendar.test
export type RootComboboxTest = typeof UI.Combobox.test
export type RootDragAndDropTest = typeof UI.DragAndDrop.test
export type RootHoverIntentTest = typeof UI.HoverIntent.test
export type RootListboxTest = typeof UI.Listbox.test
export type RootPopoverTest = typeof UI.Popover.test
export type RootTooltipTest = typeof UI.Tooltip.test
export type RootVirtualListTest = typeof UI.VirtualList.test

export const animationDefinitions = [
  Animation.test.WaitForPaint,
  Animation.test.WaitForAnimationSettled,
]
export const calendarDefinitions = [Calendar.test.FocusGrid]
export const comboboxDefinitions = [
  Combobox.test.LockScroll,
  Combobox.test.UnlockScroll,
  Combobox.test.InertOthers,
  Combobox.test.RestoreInert,
  Combobox.test.FocusInput,
  Combobox.test.ScrollItemIntoView,
  Combobox.test.ClickItem,
  Combobox.test.DetectMovementOrAnimationEnd,
  Combobox.test.Anchor,
  Combobox.test.AttachPreventBlur,
  Combobox.test.AttachSelectOnFocus,
  Combobox.test.PortalBackdrop,
]
export const dragAndDropDefinitions = [
  DragAndDrop.test.FocusItem,
  DragAndDrop.test.ResolveKeyboardMove,
]
export const hoverIntentDefinitions = [
  HoverIntent.test.WaitBeforeOpening,
  HoverIntent.test.WaitBeforeClosing,
]
export const listboxDefinitions = [
  Listbox.test.LockListboxScroll,
  Listbox.test.UnlockListboxScroll,
  Listbox.test.InertListboxOthers,
  Listbox.test.RestoreListboxInert,
  Listbox.test.FocusListboxButton,
  Listbox.test.FocusListboxItems,
  Listbox.test.ScrollListboxItemIntoView,
  Listbox.test.ClickListboxItem,
  Listbox.test.DelayClearListboxSearch,
  Listbox.test.DetectListboxMovementOrAnimationEnd,
  Listbox.test.AnchorListbox,
  Listbox.test.PortalListboxBackdrop,
]
export const popoverDefinitions = [
  Popover.test.LockPopoverScroll,
  Popover.test.UnlockPopoverScroll,
  Popover.test.InertPopoverOthers,
  Popover.test.RestorePopoverInert,
  Popover.test.FocusPopoverPanel,
  Popover.test.FocusPopoverButton,
  Popover.test.DetectPopoverMovementOrAnimationEnd,
  Popover.test.AnchorPopover,
  Popover.test.PortalPopoverBackdrop,
]
export const tooltipDefinitions = [
  Tooltip.test.WaitBeforeShowing,
  Tooltip.test.AnchorTooltip,
]
export const virtualListDefinitions = [
  VirtualList.test.ApplyScroll,
  VirtualList.test.ObserveVirtualList,
]

export const implementationLayers = Layer.mergeAll(
  Animation.layer,
  Calendar.layer,
  Combobox.layer,
  DragAndDrop.layer,
  HoverIntent.layer,
  Listbox.layer,
  Popover.layer,
  Tooltip.layer,
  VirtualList.layer,
)
