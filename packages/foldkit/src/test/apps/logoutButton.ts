import { Match as M, Option, Schema as S } from 'effect'

import type { Html } from '../../html/index.js'
import { html } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({ label: S.String })
export type Model = typeof Model.Type

// MESSAGE

export const ClickedLogout = m('ClickedLogout')
export const CompletedAction = m('CompletedAction')

export const Message = S.Union([ClickedLogout, CompletedAction])
export type Message = typeof Message.Type

// OUT MESSAGE

export const RequestedLogout = m('RequestedLogout')

export const OutMessage = S.Union([RequestedLogout])
export type OutMessage = typeof OutMessage.Type

// INIT

export const initialModel: Model = { label: 'Log out' }

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>, Option.Option<OutMessage>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<never>, Option.Option<OutMessage>]
    >(),
    M.tagsExhaustive({
      ClickedLogout: () => [model, [], Option.some(RequestedLogout())],
      CompletedAction: () => [model, [], Option.none()],
    }),
  )

// VIEW

const { div, button, OnClick, Role } = html<Message>()

export const view = (model: Model): Html =>
  div([], [button([OnClick(ClickedLogout()), Role('button')], [model.label])])
