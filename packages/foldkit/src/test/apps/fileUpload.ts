import { Schema as S } from 'effect'

import { File } from '../../file/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'

// MODEL

export type Model = Readonly<{
  receivedFiles: ReadonlyArray<File>
}>

export const initialModel: Model = { receivedFiles: [] }

// MESSAGE

export const Message = defineMessageUnion({
  ReceivedFiles: { files: S.Array(File) },
})

export type Message = typeof Message.Type

// UPDATE

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<never>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ReceivedFiles: ({ files }) => ({
      model: { ...model, receivedFiles: files },
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.input([
        h.Key('file-input'),
        h.AriaLabel('resume'),
        h.Type('file'),
        h.OnFileChange(files => Message.ReceivedFiles({ files })),
      ]),
      h.div(
        [
          h.Key('drop-zone'),
          h.AriaLabel('attachments'),
          h.OnDropFiles(files => Message.ReceivedFiles({ files })),
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
