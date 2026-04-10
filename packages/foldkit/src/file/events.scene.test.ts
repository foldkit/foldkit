import { describe, it } from '@effect/vitest'
import { Match as M, Schema as S } from 'effect'

import type { Html } from '../html'
import { html } from '../html'
import { m } from '../message'
import * as Scene from '../test/scene'
import type { File } from './file'
import { File as FileSchema } from './file'

// MODEL

type Model = Readonly<{
  receivedFiles: ReadonlyArray<File>
}>

const initialModel: Model = { receivedFiles: [] }

// MESSAGE

const ReceivedFiles = m('ReceivedFiles', { files: S.Array(FileSchema) })

const Message = S.Union(ReceivedFiles)
type Message = typeof Message.Type

// UPDATE

const update = (
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

const { div, input, Key, Type, OnFileChange, OnDropFiles } = html<Message>()

const receivedFilesSummary = (model: Model): Html =>
  div(
    [],
    [
      div(
        [Key('file-count')],
        [`count: ${String(model.receivedFiles.length)}`],
      ),
      div(
        [Key('file-names')],
        [`names: ${model.receivedFiles.map(file => file.name).join(',')}`],
      ),
    ],
  )

const fileInputView = (model: Model): Html =>
  div(
    [],
    [
      input(
        [
          Key('file-input'),
          Type('file'),
          OnFileChange(files => ReceivedFiles({ files })),
        ],
        [],
      ),
      receivedFilesSummary(model),
    ],
  )

const dropZoneView = (model: Model): Html =>
  div(
    [],
    [
      div(
        [Key('drop-zone'), OnDropFiles(files => ReceivedFiles({ files }))],
        ['Drop files here'],
      ),
      receivedFilesSummary(model),
    ],
  )

// HELPERS

const makeFile = (name: string, contents = 'data'): File =>
  new File([contents], name, { type: 'text/plain' })

const countLocator = Scene.selector('[key="file-count"]')
const namesLocator = Scene.selector('[key="file-names"]')

// TESTS

describe('OnFileChange', () => {
  it('captures a single file selected via a file input', () => {
    const resume = makeFile('resume.pdf')

    Scene.scene(
      { update, view: fileInputView },
      Scene.with(initialModel),
      Scene.changeFiles('[key="file-input"]', [resume]),
      Scene.expect(countLocator).toHaveText('count: 1'),
      Scene.expect(namesLocator).toHaveText('names: resume.pdf'),
    )
  })

  it('captures multiple files in a single change event', () => {
    const files = [makeFile('a.txt'), makeFile('b.txt'), makeFile('c.txt')]

    Scene.scene(
      { update, view: fileInputView },
      Scene.with(initialModel),
      Scene.changeFiles('[key="file-input"]', files),
      Scene.expect(countLocator).toHaveText('count: 3'),
      Scene.expect(namesLocator).toHaveText('names: a.txt,b.txt,c.txt'),
    )
  })

  it('dispatches an empty array when no files are provided', () => {
    Scene.scene(
      { update, view: fileInputView },
      Scene.with({
        ...initialModel,
        receivedFiles: [makeFile('previous.txt')],
      }),
      Scene.changeFiles('[key="file-input"]', []),
      Scene.expect(countLocator).toHaveText('count: 0'),
      Scene.expect(namesLocator).toHaveText('names: '),
    )
  })
})

describe('OnDropFiles', () => {
  it('captures files dropped onto the drop zone', () => {
    const attachment = makeFile('photo.png')

    Scene.scene(
      { update, view: dropZoneView },
      Scene.with(initialModel),
      Scene.dropFiles('[key="drop-zone"]', [attachment]),
      Scene.expect(countLocator).toHaveText('count: 1'),
      Scene.expect(namesLocator).toHaveText('names: photo.png'),
    )
  })

  it('captures multiple dropped files', () => {
    const files = [makeFile('one.png'), makeFile('two.png')]

    Scene.scene(
      { update, view: dropZoneView },
      Scene.with(initialModel),
      Scene.dropFiles('[key="drop-zone"]', files),
      Scene.expect(countLocator).toHaveText('count: 2'),
      Scene.expect(namesLocator).toHaveText('names: one.png,two.png'),
    )
  })
})
