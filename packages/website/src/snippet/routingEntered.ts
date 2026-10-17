import { Option } from 'effect'
import { Command } from 'foldkit'
import { Transition } from 'foldkit/route'

type Commands = ReadonlyArray<Command.Command<Message>>

const commandsForTransition = (
  transition: Transition.Transition<ApplicationRoute>,
): Commands =>
  Option.match(Transition.entered(transition, 'Person'), {
    onNone: () => [],
    onSome: ({ personId }) => [FetchPerson({ personId })],
  })
