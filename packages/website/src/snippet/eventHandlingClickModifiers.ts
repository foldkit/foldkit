import type { HtmlBuilder } from 'foldkit/html'

const itemButton = (itemId: string, h: HtmlBuilder<Message>) =>
  h.button(
    [
      h.OnClick(({ metaKey, ctrlKey }) =>
        Message.ClickedItem({
          itemId,
          isExtendingSelection: metaKey || ctrlKey,
        }),
      ),
    ],
    [itemId],
  )
