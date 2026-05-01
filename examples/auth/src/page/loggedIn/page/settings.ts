import { Schema as S } from 'effect'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Session } from '../../../domain/session'
import { Class, OnClick, button, div, h1, h2, p } from '../../../html'
import type { Message as ParentMessage } from '../../../message'

// MESSAGE

export const ClickedLogout = m('ClickedLogout')
export const Message = S.Union([ClickedLogout])
export type Message = typeof Message.Type

// VIEW

const infoRow = (label: string, value: string): Html =>
  div(
    [Class('flex justify-between items-center py-2 border-b border-gray-100')],
    [
      p([Class('text-gray-600')], [label]),
      p([Class('font-medium text-gray-800')], [value]),
    ],
  )

export const view = (
  session: Session,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-6')], ['Settings']),
      div(
        [Class('bg-white rounded-lg shadow-md p-6 mb-6')],
        [
          h2(
            [Class('text-xl font-semibold text-gray-800 mb-4')],
            ['Account Information'],
          ),
          div(
            [Class('space-y-4')],
            [
              infoRow('User ID', session.userId),
              infoRow('Email', session.email),
              infoRow('Name', session.name),
            ],
          ),
        ],
      ),
      div(
        [Class('bg-white rounded-lg shadow-md p-6')],
        [
          h2([Class('text-xl font-semibold text-gray-800 mb-4')], ['Actions']),
          button(
            [
              OnClick(toParentMessage(ClickedLogout())),
              Class(
                'px-6 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition cursor-pointer',
              ),
            ],
            ['Sign Out'],
          ),
        ],
      ),
    ],
  )
