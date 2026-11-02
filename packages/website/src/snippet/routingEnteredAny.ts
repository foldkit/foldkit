import { Match, Option } from 'effect'
import { Transition } from 'foldkit/route'

type Commands = ReadonlyArray<
  ReturnType<typeof FetchPeopleFilters> | ReturnType<typeof FetchPerson>
>

const commandsForTransition = (
  transition: Transition.Transition<ApplicationRoute>,
): Commands =>
  Option.match(Transition.enteredAny(transition), {
    onNone: () => [],
    onSome: Match.type<ApplicationRoute>().pipe(
      Match.withReturnType<Commands>(),
      Match.tag('People', () => [FetchPeopleFilters()]),
      Match.tag('Person', ({ personId }) => [FetchPerson({ personId })]),
      Match.orElse(() => []),
    ),
  })
