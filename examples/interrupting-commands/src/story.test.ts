import { Array, Option } from 'effect'
import { Story } from 'foldkit'
import { Interruptible } from 'foldkit/command'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { CancelUploadFile, UploadFile } from './command'
import { ApplicationBlock, layer } from './index'
import { initialModel } from './init'
import { Message } from './message'
import { FAKE_FILES } from './update'

const firstFile = Array.headNonEmpty(FAKE_FILES)
const secondFile = Option.getOrThrow(Array.get(FAKE_FILES, 1))

describe('update', () => {
  it.effect(
    'starting an upload appends an Uploading entry and fires UploadFile',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ClickedStartUpload()),
        Story.model(model => {
          expect(model.uploads).toEqual([
            {
              id: 0,
              fileName: firstFile.name,
              sizeMegabytes: firstFile.sizeMegabytes,
              status: 'Uploading',
            },
          ])
          expect(model.uploadId).toBe(1)
        }),
        Story.Command.expectExact(
          UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
        ),
        Story.Command.resolve(
          UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
          Message.CompletedUploadFile({ uploadId: 0 }),
        ),
        Story.model(model => {
          expect(Array.map(model.uploads, upload => upload.status)).toEqual([
            'Done',
          ])
        }),
      ),
  )

  it.effect('cancelling an upload interrupts it and marks it Cancelled', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedStartUpload()),
      Story.message(Message.ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
        ])
      }),
    ),
  )

  it.effect(
    'a cancel that lands after completion resolves NotFound and changes nothing',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ClickedStartUpload()),
        Story.Command.resolve(
          UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
          Message.CompletedUploadFile({ uploadId: 0 }),
        ),
        Story.message(Message.ClickedCancelUpload({ uploadId: 0 })),
        Story.Command.resolve(
          CancelUploadFile({ uploadId: 0 }),
          Message.CompletedCancelUploadFile({
            uploadId: 0,
            outcome: Interruptible.Outcome.NotFound(),
          }),
        ),
        Story.model(model => {
          expect(Array.map(model.uploads, upload => upload.status)).toEqual([
            'Done',
          ])
        }),
      ),
  )

  it.effect('cancelling one upload leaves the other running', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedStartUpload()),
      Story.message(Message.ClickedStartUpload()),
      Story.message(Message.ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Story.Command.expectExact(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
      ),
      Story.Command.resolve(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
        Message.CompletedUploadFile({ uploadId: 1 }),
      ),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
          'Done',
        ])
      }),
    ),
  )

  it.effect(
    'a new upload can start while a cancellation is still pending',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ClickedStartUpload()),
        Story.message(Message.ClickedCancelUpload({ uploadId: 0 })),
        Story.message(Message.ClickedStartUpload()),
        Story.Command.resolve(
          CancelUploadFile({ uploadId: 0 }),
          Message.CompletedCancelUploadFile({
            uploadId: 0,
            outcome: Interruptible.Outcome.Interrupted(),
          }),
        ),
        Story.Command.resolve(
          UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
          Message.CompletedUploadFile({ uploadId: 1 }),
        ),
        Story.model(model => {
          expect(Array.map(model.uploads, upload => upload.status)).toEqual([
            'Cancelled',
            'Done',
          ])
        }),
      ),
  )

  it.effect('restarting a cancelled upload reuses its id and file', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedStartUpload()),
      Story.message(Message.ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Story.message(Message.ClickedRestartUpload({ uploadId: 0 })),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Uploading',
        ])
      }),
      Story.Command.expectExact(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
      ),
      Story.Command.resolve(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
        Message.CompletedUploadFile({ uploadId: 0 }),
      ),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Done',
        ])
      }),
    ),
  )

  it.effect('cancel all interrupts every running upload and only those', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedStartUpload()),
      Story.message(Message.ClickedStartUpload()),
      Story.message(Message.ClickedStartUpload()),
      Story.Command.resolve(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
        Message.CompletedUploadFile({ uploadId: 1 }),
      ),
      Story.message(Message.ClickedCancelAllUploads()),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 2 }),
        Message.CompletedCancelUploadFile({
          uploadId: 2,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
          'Done',
          'Cancelled',
        ])
      }),
    ),
  )
})
