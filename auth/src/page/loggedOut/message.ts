import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { Session } from '../../domain/session'
import * as Login from './page/login'

// MESSAGE

export const GotLoginMessage = m('GotLoginMessage', { message: Login.Message })
export const Message = S.Union(GotLoginMessage)
export type Message = typeof Message.Type

// OUT MESSAGE

export const SucceededLogin = m('SucceededLogin', { session: Session })
export const OutMessage = S.Union(SucceededLogin)
export type OutMessage = typeof OutMessage.Type
