import type { Html, HtmlBuilder } from 'foldkit/html'

const entryListView = (
  entries: ReadonlyArray<Entry>,
  h: HtmlBuilder<Message>,
): Html =>
  h.ul(
    [],
    entries.map(entry =>
      h.keyed('li')(
        entry.id,
        [],
        [
          h.input([
            h.Value(entry.text),
            h.OnInput(text => EditedEntry({ id: entry.id, text })),
          ]),
        ],
      ),
    ),
  )
