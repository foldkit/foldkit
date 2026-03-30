import { Array, Option } from 'effect'
import { createKeyedLazy, html } from 'foldkit/html'

const { div, li, span, ul } = html<Message>()

// Define the per-item view at module level
const contactView = (name: string, email: string, isSelected: boolean) =>
  li(
    [],
    [
      span([], [name]),
      span([], [email]),
      ...(isSelected ? [span([], ['✓'])] : []),
    ],
  )

// Create the keyed lazy map at module level.
// Each key gets its own independent cache slot.
const lazyContact = createKeyedLazy()

// When rendering a list, only items whose args changed are recomputed.
// If you select a different contact, only the previously-selected
// and newly-selected items re-render. All others return cached VNodes.
const contactListView = (
  contacts: ReadonlyArray<Contact>,
  maybeSelectedId: Option.Option<string>,
) =>
  ul(
    [],
    Array.map(contacts, contact => {
      const isSelected = Option.exists(
        maybeSelectedId,
        selectedId => selectedId === contact.id,
      )

      return lazyContact(contact.id, contactView, [
        contact.name,
        contact.email,
        isSelected,
      ])
    }),
  )
