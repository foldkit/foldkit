import { Array, Option } from 'effect'
import { Command } from 'foldkit'
import { Transition } from 'foldkit/route'

type Commands = ReadonlyArray<Command.Command<Message>>

// Leaving a route is a fact too: one-shot Commands on the way out...
const commandsOnExit = (
  transition: Transition.Transition<AppRoute>,
): Commands =>
  Option.match(Transition.exitedRoute(transition, 'Person'), {
    onNone: () => [],
    onSome: ({ personId }) => [RecordVisitEnded({ personId })],
  })

// ...and stayed hands you both sides of a within-route change:
const commandsOnPersonChange = (
  transition: Transition.Transition<AppRoute>,
): Commands =>
  Option.match(Transition.stayed(transition, 'Person'), {
    onNone: () => [],
    onSome: ({ previousRoute, nextRoute }) =>
      previousRoute.personId === nextRoute.personId
        ? []
        : [FetchPerson({ personId: nextRoute.personId })],
  })

// Transition helpers compose by concatenation
const commandsForTransition = (
  transition: Transition.Transition<AppRoute>,
): Commands =>
  Array.flatten([
    commandsOnExit(transition),
    commandsOnPersonChange(transition),
  ])
