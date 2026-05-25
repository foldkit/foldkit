import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { PeopleRoute } from '../route'

export const ChangedRoute = m('ChangedRoute', { route: PeopleRoute })
export const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })

export const Message = S.Union([ChangedRoute, ChangedSearchInput])
export type Message = typeof Message.Type
