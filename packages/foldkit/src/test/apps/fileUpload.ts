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

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.input([
        h.Key('file-input'),
        h.AriaLabel('resume'),
        h.Type('file'),
        h.OnFileChange(files => ReceivedFiles({ files })),
      ]),
      h.div(
        [
          h.Key('drop-zone'),
          h.AriaLabel('attachments'),
          h.OnDropFiles(files => ReceivedFiles({ files })),
        ],
        ['Drop files here'],
      ),
      h.div(
        [h.Key('received-count')],
        [`count=${String(model.receivedFiles.length)}`],
      ),
      h.div(
        [h.Key('received-names')],
        [`names=${model.receivedFiles.map(file => file.name).join(',')}`],
      ),
    ],
  )
}
