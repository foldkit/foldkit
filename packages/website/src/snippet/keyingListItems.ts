import { html } from 'foldkit/html'

const h = html<Message>()

const entryListView = (entries: ReadonlyArray<Entry>): Html =>
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
