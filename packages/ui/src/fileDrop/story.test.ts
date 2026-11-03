import { Array } from 'effect'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Message, OutMessage, FileDropBlock as block, layer } from './block.js'

const makeFile = (name: string, type = 'application/pdf'): File =>
  new globalThis.File(['content'], name, { type })

const givenInitial = Story.init({ id: 'test' })

it.layer(layer, { buildPerTest: true })(it => {
  describe('FileDrop', () => {
    describe('init', () => {
      it.effect('starts with drag-over false', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(model.id).toBe('test')
            expect(model.isDragOver).toBe(false)
          }),
        ),
      )
    })

    describe('update', () => {
      describe('EnteredDragZone', () => {
        it.effect('sets isDragOver to true', () =>
          Story.story(
            block,
            givenInitial,
            Story.message(Message.EnteredDragZone()),
            Story.model(model => {
              expect(model.isDragOver).toBe(true)
            }),
            Story.expectNoOutMessage(),
          ),
        )
      })

      describe('LeftDragZone', () => {
        it.effect('sets isDragOver to false', () =>
          Story.story(
            block,
            givenInitial,
            Story.message(Message.EnteredDragZone()),
            Story.message(Message.LeftDragZone()),
            Story.model(model => {
              expect(model.isDragOver).toBe(false)
            }),
            Story.expectNoOutMessage(),
          ),
        )
      })

      describe('DroppedFiles', () => {
        it.effect('emits ReceivedFiles as an OutMessage', () => {
          const file = makeFile('resume.pdf')
          return Story.story(
            block,
            givenInitial,
            Story.message(Message.DroppedFiles({ files: [file] })),
            Story.expectOutMessage(OutMessage.ReceivedFiles({ files: [file] })),
          )
        })

        it.effect('resets isDragOver to false', () => {
          const file = makeFile('resume.pdf')
          return Story.story(
            block,
            givenInitial,
            Story.message(Message.EnteredDragZone()),
            Story.message(Message.DroppedFiles({ files: [file] })),
            Story.model(model => {
              expect(model.isDragOver).toBe(false)
            }),
          )
        })

        it.effect(
          'carries every dropped file through to the OutMessage',
          () => {
            const files = Array.make(
              makeFile('a.pdf'),
              makeFile('b.pdf'),
              makeFile('c.pdf'),
            )
            return Story.story(
              block,
              givenInitial,
              Story.message(Message.DroppedFiles({ files })),
              Story.expectOutMessage(OutMessage.ReceivedFiles({ files })),
            )
          },
        )
      })

      describe('DroppedNonFiles', () => {
        it.effect('emits RejectedNonFiles as an OutMessage', () =>
          Story.story(
            block,
            givenInitial,
            Story.message(Message.DroppedNonFiles()),
            Story.expectOutMessage(OutMessage.RejectedNonFiles()),
          ),
        )

        it.effect('resets isDragOver to false', () =>
          Story.story(
            block,
            givenInitial,
            Story.message(Message.EnteredDragZone()),
            Story.message(Message.DroppedNonFiles()),
            Story.model(model => {
              expect(model.isDragOver).toBe(false)
            }),
          ),
        )
      })
    })
  })
})
