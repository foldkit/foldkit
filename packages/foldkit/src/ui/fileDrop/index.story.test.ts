import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import * as Story from '../../test/story'
import {
  DroppedFiles,
  EnteredDragZone,
  LeftDragZone,
  ReceivedFiles,
  init,
  update,
} from './index'

const makeFile = (name: string, type = 'application/pdf'): File =>
  new globalThis.File(['content'], name, { type })

const withInitial = Story.with(init({ id: 'test' }))

describe('FileDrop', () => {
  describe('init', () => {
    it('starts with drag-over false', () => {
      const model = init({ id: 'test' })
      expect(model.id).toBe('test')
      expect(model.isDragOver).toBe(false)
    })
  })

  describe('update', () => {
    describe('EnteredDragZone', () => {
      it('sets isDragOver to true', () => {
        Story.story(
          update,
          withInitial,
          Story.message(EnteredDragZone()),
          Story.model(model => {
            expect(model.isDragOver).toBe(true)
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('LeftDragZone', () => {
      it('sets isDragOver to false', () => {
        Story.story(
          update,
          withInitial,
          Story.message(EnteredDragZone()),
          Story.message(LeftDragZone()),
          Story.model(model => {
            expect(model.isDragOver).toBe(false)
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('DroppedFiles', () => {
      it('emits ReceivedFiles as an OutMessage', () => {
        const file = makeFile('resume.pdf')
        Story.story(
          update,
          withInitial,
          Story.message(DroppedFiles({ files: [file] })),
          Story.expectOutMessage(ReceivedFiles({ files: [file] })),
        )
      })

      it('resets isDragOver to false', () => {
        const file = makeFile('resume.pdf')
        Story.story(
          update,
          withInitial,
          Story.message(EnteredDragZone()),
          Story.message(DroppedFiles({ files: [file] })),
          Story.model(model => {
            expect(model.isDragOver).toBe(false)
          }),
        )
      })

      it('carries every dropped file through to the OutMessage', () => {
        const files = [makeFile('a.pdf'), makeFile('b.pdf'), makeFile('c.pdf')]
        Story.story(
          update,
          withInitial,
          Story.message(DroppedFiles({ files })),
          Story.expectOutMessage(ReceivedFiles({ files })),
        )
      })
    })
  })
})
