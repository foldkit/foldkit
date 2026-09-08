import { Match, Option } from 'effect'
import { Command } from 'foldkit'
import { Transition } from 'foldkit/route'

type Commands = ReadonlyArray<Command.Command<Message>>

const commandsForTransition = (
  transition: Transition.Transition<AppRoute>,
): Commands =>
  Option.match(Transition.enteredAny(transition), {
    onNone: () => [],
    onSome: Match.type<AppRoute>().pipe(
      Match.withReturnType<Commands>(),
      Match.tag('People', () => [FetchPeopleFilters()]),
      Match.tag('Person', ({ personId }) => [FetchPerson({ personId })]),
      Match.orElse(() => []),
    ),
  })
