import { html } from 'foldkit/html'

const { input, ul, keyed, Value, OnInput } = html<Message>()

const entryListView = (entries: ReadonlyArray<Entry>): Html =>
  ul(
    [],
    entries.map(entry =>
      keyed('li')(
        entry.id,
        [],
        [
          input([
            Value(entry.text),
            OnInput(text => EditedEntry({ id: entry.id, text })),
          ]),
        ],
      ),
    ),
  )
