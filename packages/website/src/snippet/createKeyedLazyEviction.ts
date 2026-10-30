import { Array, Schema } from 'effect'
import { type HtmlBuilder, createKeyedLazy } from 'foldkit/html'

const Contact = Schema.Struct({ id: Schema.String, name: Schema.String })
type Contact = typeof Contact.Type

const contactView = (contact: Contact, h: HtmlBuilder<never>) =>
  h.keyed('li')(contact.id, [], [contact.name])

const lazyContact = createKeyedLazy({ evict: 'AbsentFromRender' })

const contactListView = (
  contacts: ReadonlyArray<Contact>,
  h: HtmlBuilder<never>,
) =>
  h.ul(
    [],
    Array.map(contacts, contact =>
      lazyContact(contact.id, contactView, [contact, h]),
    ),
  )
