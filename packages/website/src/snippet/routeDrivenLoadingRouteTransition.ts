import { Route } from 'foldkit'

export type RouteTransition = Route.RouteTransition<AppRoute>

export const isTransitionTo = Route.isTransitionTo<AppRoute>
