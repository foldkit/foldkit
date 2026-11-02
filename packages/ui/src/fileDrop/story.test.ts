import { Array } from 'effect'
import {
  expectNoOutMessage,
  expectOutMessage,
  message,
  model,
  story,
} from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { FileDropLive, Message, OutMessage } from './block.js'

const makeFile = (name: string, type = 'application/pdf'): File =>
  new globalThis.File(['content'], name, { type })

const args = { id: 'test' }

describe('FileDrop', () => {
  describe('init', () => {
    it.effect('starts with drag-over false', () =>
      story(
        FileDropLive,
        args,
        model(model => {
          expect(model.id).toBe('test')
          expect(model.isDragOver).toBe(false)
        }),
      ),
    )
  })

  describe('update', () => {
    describe('EnteredDragZone', () => {
      it.effect('sets isDragOver to true', () =>
        story(
          FileDropLive,
          args,
          message(Message.EnteredDragZone()),
          model(model => {
            expect(model.isDragOver).toBe(true)
          }),
          expectNoOutMessage(),
        ),
      )
    })

    describe('LeftDragZone', () => {
      it.effect('sets isDragOver to false', () =>
        story(
          FileDropLive,
          args,
          message(Message.EnteredDragZone()),
          message(Message.LeftDragZone()),
          model(model => {
            expect(model.isDragOver).toBe(false)
          }),
          expectNoOutMessage(),
        ),
      )
    })

    describe('DroppedFiles', () => {
      it.effect('emits ReceivedFiles as an OutMessage', () => {
        const file = makeFile('resume.pdf')
        return story(
          FileDropLive,
          args,
          message(Message.DroppedFiles({ files: [file] })),
          expectOutMessage(OutMessage.ReceivedFiles({ files: [file] })),
        )
      })

      it.effect('resets isDragOver to false', () => {
        const file = makeFile('resume.pdf')
        return story(
          FileDropLive,
          args,
          message(Message.EnteredDragZone()),
          message(Message.DroppedFiles({ files: [file] })),
          model(model => {
            expect(model.isDragOver).toBe(false)
          }),
        )
      })

      it.effect('carries every dropped file through to the OutMessage', () => {
        const files = Array.make(
          makeFile('a.pdf'),
          makeFile('b.pdf'),
          makeFile('c.pdf'),
        )
        return story(
          FileDropLive,
          args,
          message(Message.DroppedFiles({ files })),
          expectOutMessage(OutMessage.ReceivedFiles({ files })),
        )
      })
    })

    describe('DroppedNonFiles', () => {
      it.effect('emits RejectedNonFiles as an OutMessage', () =>
        story(
          FileDropLive,
          args,
          message(Message.DroppedNonFiles()),
          expectOutMessage(OutMessage.RejectedNonFiles()),
        ),
      )

      it.effect('resets isDragOver to false', () =>
        story(
          FileDropLive,
          args,
          message(Message.EnteredDragZone()),
          message(Message.DroppedNonFiles()),
          model(model => {
            expect(model.isDragOver).toBe(false)
          }),
        ),
      )
    })
  })
})
