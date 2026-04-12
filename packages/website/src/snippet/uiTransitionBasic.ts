import { Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, p } from './html'

// MODEL — embed Transition.Model and your own visibility flag
//   transition: Ui.Transition.Model
//   isShowing: S.Boolean

// INIT
//   transition: Ui.Transition.init({ id: 'content' })
//   isShowing: false

// MESSAGE

const GotTransitionMessage = m('GotTransitionMessage', {
  message: Ui.Transition.Message,
})
const ToggledContent = m('ToggledContent')

// UPDATE — Transition.update returns a three-tuple: [model, commands, maybeOutMessage]

ToggledContent: () => {
  const nextShowing = !model.isShowing
  const [nextTransition, commands, maybeOutMessage] = Ui.Transition.update(
    model.transition,
    nextShowing ? Ui.Transition.Showed() : Ui.Transition.Hidden(),
  )

  return handleTransitionUpdate(
    evo(model, { isShowing: () => nextShowing }),
    nextTransition,
    commands,
    maybeOutMessage,
  )
}

GotTransitionMessage: ({ message }) => {
  const [nextTransition, commands, maybeOutMessage] = Ui.Transition.update(
    model.transition,
    message,
  )

  return handleTransitionUpdate(
    model,
    nextTransition,
    commands,
    maybeOutMessage,
  )
}

const handleTransitionUpdate = (
  model,
  nextTransition,
  commands,
  maybeOutMessage,
) => {
  const toMessage = message => GotTransitionMessage({ message })

  const mappedCommands = commands.map(Command.mapEffect(Effect.map(toMessage)))

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        M.tagsExhaustive({
          StartedLeaveAnimating: () => [
            Command.mapEffect(
              Ui.Transition.defaultLeaveCommand(nextTransition),
              Effect.map(toMessage),
            ),
          ],
          TransitionedOut: () => [],
        }),
      ),
  })

  return [
    evo(model, { transition: () => nextTransition }),
    [...mappedCommands, ...additionalCommands],
  ]
}

// VIEW — CSS transitions driven by data attributes

Ui.Transition.view({
  model: model.transition,
  animateSize: true,
  className:
    'transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
  content: p([], ['This content animates in and out.']),
})
