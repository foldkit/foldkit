import { Message as ChildMessage } from '../child/definition'
import { Message as EntryMessage } from './entry/definition'
import type { EntryViewBuilder } from './entry/entry'
import { ParentComposition } from './composition'

const AliasedEntryMessage = EntryMessage

const foreignEntryButton = (h: EntryViewBuilder) =>
  h.button([h.OnClick(EntryMessage.ClickedEntryFromForeignBuilder())])

export const view = ParentComposition.makeView((_model, h) =>
  h.div(
    [h.OnClick(ChildMessage.ClickedChildSave())],
    [
      h.button([h.OnClick(AliasedEntryMessage.ClickedEntrySave())]),
      foreignEntryButton(h),
    ],
  ),
)
