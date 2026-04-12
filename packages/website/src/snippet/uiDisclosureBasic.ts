import { Effect, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, p, span } from './html'

// MODEL

const Model = S.Struct({
  disclosure: Ui.Disclosure.Model,
})

// INIT

const init = () => [{ disclosure: Ui.Disclosure.init({ id: 'faq-1' }) }, []]

// MESSAGE

const GotDisclosureMessage = m('GotDisclosureMessage', {
  message: Ui.Disclosure.Message,
})

// UPDATE

GotDisclosureMessage: ({ message }) => {
  const [nextDisclosure, commands] = Ui.Disclosure.update(
    model.disclosure,
    message,
  )

  return [
    evo(model, { disclosure: () => nextDisclosure }),
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotDisclosureMessage({ message })),
      ),
    ),
  ]
}

// VIEW

Ui.Disclosure.view({
  model: model.disclosure,
  toParentMessage: message => GotDisclosureMessage({ message }),
  buttonContent: span([], ['What is Foldkit?']),
  panelContent: p([], ['A functional UI framework built on Effect-TS.']),
  buttonClassName:
    'flex items-center justify-between w-full p-4 border rounded-lg data-[open]:rounded-b-none',
  panelClassName: 'p-4 border-x border-b rounded-b-lg',
})
