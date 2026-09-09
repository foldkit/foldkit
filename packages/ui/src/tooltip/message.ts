import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

/** Union of all messages the tooltip component can produce. */
export const Message = defineMessageUnion({
  EnteredTrigger: {},
  LeftTrigger: {},
  FocusedTrigger: {},
  BlurredTrigger: {},
  PressedEscape: {},
  PressedPointerOnTrigger: { pointerType: Schema.String },
  CompletedWaitBeforeShowing: { version: Schema.Number },
  CompletedAnchorTooltip: {},
})

export type EnteredTrigger = typeof Message.EnteredTrigger.Type
export type LeftTrigger = typeof Message.LeftTrigger.Type
export type FocusedTrigger = typeof Message.FocusedTrigger.Type
export type BlurredTrigger = typeof Message.BlurredTrigger.Type
export type PressedEscape = typeof Message.PressedEscape.Type
export type PressedPointerOnTrigger =
  typeof Message.PressedPointerOnTrigger.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Union of out-messages the tooltip component can produce. */
export const OutMessage = defineMessageUnion({
  Shown: {},
  Hidden: {},
})

export type Shown = typeof OutMessage.Shown.Type
export type Hidden = typeof OutMessage.Hidden.Type
export type OutMessage = typeof OutMessage.Type
