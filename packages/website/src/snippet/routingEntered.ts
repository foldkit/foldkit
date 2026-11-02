import { Option } from 'effect'
import { Transition } from 'foldkit/route'

type Commands = ReadonlyArray<ReturnType<typeof FetchPerson>>

const commandsForTransition = (
  transition: Transition.Transition<ApplicationRoute>,
): Commands =>
  Option.match(Transition.entered(transition, 'Person'), {
    onNone: () => [],
    onSome: ({ personId }) => [FetchPerson({ personId })],
  })
