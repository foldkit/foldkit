import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class } from './html'

// Submodel wiring:
//   Model field: disclosure: Ui.Disclosure.Model
//   Init: Ui.Disclosure.init({ id: 'faq-1' })
//   Update: delegate via Ui.Disclosure.update

const GotDisclosureMessage = m('GotDisclosureMessage', {
  message: Ui.Disclosure.Message,
})

Ui.Disclosure.view({
  model: model.disclosure,
  toParentMessage: message => GotDisclosureMessage({ message }),
  buttonContent: span([], ['What is Foldkit?']),
  panelContent: p([], ['A functional UI framework built on Effect-TS.']),
  buttonClassName:
    'flex items-center justify-between w-full p-4 border rounded-lg',
  panelClassName: 'p-4 border-x border-b rounded-b-lg',
})
