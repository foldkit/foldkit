import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { HistoryPage as VirtualListHistoryPage } from '@foldkit/ui/virtualList'

import {
  VirtualListChatHistorySource,
  VirtualListChatMessage,
} from './domain/domain'

export const Message = defineMessageUnion({
  ClickedButtonDemo: {},
  UpdatedInputDemoValue: { value: Schema.String },
  UpdatedTextareaDemoValue: { value: Schema.String },
  UpdatedFieldsetInputValue: { value: Schema.String },
  UpdatedFieldsetTextareaValue: { value: Schema.String },
  ToggledFieldsetCheckboxDemo: { isChecked: Schema.Boolean },
  ToggledCheckboxBasicDemo: { isChecked: Schema.Boolean },
  ToggledCheckboxAllDemo: { isChecked: Schema.Boolean },
  ToggledCheckboxOptionADemo: { isChecked: Schema.Boolean },
  ToggledCheckboxOptionBDemo: { isChecked: Schema.Boolean },
  ClickedDeleteProject: {},
  ClickedOpenDialog: {},
  ClickedOpenAnimatedDialog: {},
  ClickedEditFilters: {},
  ClickedOpenProjectSettings: {},
  ToggledDisclosureDemo: { isOpen: Schema.Boolean },
  ToggledDisclosureCollapsedPreviewDemo: { isOpen: Schema.Boolean },
  UpdatedSelectDemoValue: { value: Schema.String },
  ToggledSwitchDemo: { isChecked: Schema.Boolean },
  ClickedRemoveFileDropDemoFile: { fileIndex: Schema.Number },
  ClickedShowInfoToast: {},
  ClickedShowSuccessToast: {},
  ClickedShowErrorToast: {},
  ClickedShowStickyToast: {},
  ClickedDismissAllToasts: {},
  ClickedHoverIntentMenuItem: {},
  ClickedToggleAnimationDemo: {},
  ClickedVirtualListScrollToMiddle: {},
  ClickedVirtualListVariableScrollToMiddle: {},
  ClickedVirtualListChatPrepend: {},
  CompletedFetchVirtualListChatHistory: {
    requestVersion: Schema.Number,
    messages: Schema.Array(VirtualListChatMessage),
    source: VirtualListChatHistorySource,
    page: VirtualListHistoryPage,
  },
  ClickedVirtualListChatScrollToMessage: {},
  ClickedVirtualListChatAppend: {},
  ClickedVirtualListChatToggleMessage: { messageId: Schema.Number },
})
export type Message = typeof Message.Type
export type CompletedFetchVirtualListChatHistory =
  typeof Message.CompletedFetchVirtualListChatHistory.Type
