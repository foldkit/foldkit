import { Option } from 'effect'
import { Command } from 'foldkit'
import { Transition } from 'foldkit/route'

type Commands = ReadonlyArray<Command.Command<Message>>

// One route, payload included: no dispatch needed
const commandsForTransition = (
  transition: Transition.Transition<AppRoute>,
): Commands =>
  Option.match(Transition.enteredRoute(transition, 'Person'), {
    onNone: () => [],
    onSome: ({ personId }) => [FetchPerson({ personId })],
  })
