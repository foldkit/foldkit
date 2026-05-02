import { Match as M, Schema as S } from 'effect'

import { File } from '../../file/index.js'
import { type Html, html } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

export type Model = Readonly<{
  receivedFiles: ReadonlyArray<File>
}>

export const initialModel: Model = { receivedFiles: [] }

// MESSAGE

export const ReceivedFiles = m('ReceivedFiles', { files: S.Array(File) })

export const Message = S.Union([ReceivedFiles])
export type Message = typeof Message.Type

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      ReceivedFiles: ({ files }) => [{ ...model, receivedFiles: files }, []],
    }),
  )

// VIEW

const { div, input, AriaLabel, Key, Type, OnFileChange, OnDropFiles } =
  html<Message>()

export const view = (model: Model): Html =>
  div(
    [],
    [
      input([
        Key('file-input'),
        AriaLabel('resume'),
        Type('file'),
        OnFileChange(files => ReceivedFiles({ files })),
      ]),
      div(
        [
          Key('drop-zone'),
          AriaLabel('attachments'),
          OnDropFiles(files => ReceivedFiles({ files })),
        ],
        ['Drop files here'],
      ),
      div(
        [Key('received-count')],
        [`count=${String(model.receivedFiles.length)}`],
      ),
      div(
        [Key('received-names')],
        [`names=${model.receivedFiles.map(file => file.name).join(',')}`],
      ),
    ],
  )
