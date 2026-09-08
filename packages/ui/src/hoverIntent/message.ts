import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

/** Union of all Messages the HoverIntent component can produce. */
export const Message = defineMessageUnion({
  EnteredTrigger: {},
  LeftTrigger: {},
  EnteredPanel: {},
  LeftPanel: {},
  FocusedTrigger: {},
  BlurredTrigger: {},
  FocusedPanel: {},
  BlurredPanel: {},
  PressedEscape: { source: Schema.Literals(['Trigger', 'Panel']) },
  CompletedWaitBeforeOpening: { version: Schema.Number },
  CompletedWaitBeforeClosing: { version: Schema.Number },
})
export type Message = typeof Message.Type

export type EnteredTrigger = typeof Message.EnteredTrigger.Type
export type LeftTrigger = typeof Message.LeftTrigger.Type
export type EnteredPanel = typeof Message.EnteredPanel.Type
export type LeftPanel = typeof Message.LeftPanel.Type
export type FocusedTrigger = typeof Message.FocusedTrigger.Type
export type BlurredTrigger = typeof Message.BlurredTrigger.Type
export type FocusedPanel = typeof Message.FocusedPanel.Type
export type BlurredPanel = typeof Message.BlurredPanel.Type
export type PressedEscape = typeof Message.PressedEscape.Type
export type CompletedWaitBeforeOpening =
  typeof Message.CompletedWaitBeforeOpening.Type
export type CompletedWaitBeforeClosing =
  typeof Message.CompletedWaitBeforeClosing.Type

// OUT MESSAGE

/** Union of visibility-transition OutMessages emitted by HoverIntent. */
export const OutMessage = defineMessageUnion({
  Opened: {},
  Closed: {},
})
export type OutMessage = typeof OutMessage.Type

export type Opened = typeof OutMessage.Opened.Type
export type Closed = typeof OutMessage.Closed.Type
