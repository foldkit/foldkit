import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Command from '../../command/public.js'
import { m, ts } from '../../schema/index.js'
import { defineMachine, to, when } from '../statechart.js'

// STATE

const Idle = ts('Idle')
const Creating = ts('Creating', { totalChunks: S.Number })
const Uploading = ts('Uploading', {
  uploadId: S.String,
  nextChunkIndex: S.Number,
  totalChunks: S.Number,
})
const Paused = ts('Paused', {
  uploadId: S.String,
  nextChunkIndex: S.Number,
  totalChunks: S.Number,
})
const Completing = ts('Completing', { uploadId: S.String })
const Done = ts('Done', { uploadId: S.String })
const Failed = ts('Failed', { reason: S.String })

const UploadState = S.Union([
  Idle,
  Creating,
  Uploading,
  Paused,
  Completing,
  Done,
  Failed,
])
type UploadState = typeof UploadState.Type

// MESSAGE

const ClickedUpload = m('ClickedUpload', { totalChunks: S.Number })
const SucceededCreate = m('SucceededCreate', { uploadId: S.String })
const FailedCreate = m('FailedCreate', { reason: S.String })
const SucceededChunk = m('SucceededChunk', { chunkIndex: S.Number })
const FailedChunk = m('FailedChunk', { chunkIndex: S.Number, reason: S.String })
const ClickedPause = m('ClickedPause')
const ClickedResume = m('ClickedResume')
const SucceededComplete = m('SucceededComplete')
const FailedComplete = m('FailedComplete', { reason: S.String })

const UploadMessage = S.Union([
  ClickedUpload,
  SucceededCreate,
  FailedCreate,
  SucceededChunk,
  FailedChunk,
  ClickedPause,
  ClickedResume,
  SucceededComplete,
  FailedComplete,
])
type UploadMessage = typeof UploadMessage.Type

// COMMAND

const CreateUpload = Command.define(
  'CreateUpload',
  { totalChunks: S.Number },
  SucceededCreate,
  FailedCreate,
)(() => Effect.succeed(SucceededCreate({ uploadId: 'upload-1' })))

const UploadChunk = Command.define(
  'UploadChunk',
  { uploadId: S.String, chunkIndex: S.Number },
  SucceededChunk,
  FailedChunk,
)(({ chunkIndex }) => Effect.succeed(SucceededChunk({ chunkIndex })))

const CompleteUpload = Command.define(
  'CompleteUpload',
  { uploadId: S.String },
  SucceededComplete,
  FailedComplete,
)(() => Effect.succeed(SucceededComplete()))

// MACHINE

const uploadMachine = defineMachine({
  state: UploadState,
  message: UploadMessage,
})({
  initial: Idle(),
  states: {
    Idle: {
      on: {
        ClickedUpload: to(
          'Creating',
          (_state, message) => Creating({ totalChunks: message.totalChunks }),
          (_state, message) => [
            CreateUpload({ totalChunks: message.totalChunks }),
          ],
        ),
      },
    },
    Creating: {
      on: {
        SucceededCreate: to(
          'Uploading',
          (state, message) =>
            Uploading({
              uploadId: message.uploadId,
              nextChunkIndex: 0,
              totalChunks: state.totalChunks,
            }),
          (_state, message) => [
            UploadChunk({ uploadId: message.uploadId, chunkIndex: 0 }),
          ],
        ),
        FailedCreate: to('Failed', (_state, message) =>
          Failed({ reason: message.reason }),
        ),
      },
    },
    Uploading: {
      on: {
        SucceededChunk: [
          when(
            (state, message) =>
              message.chunkIndex === state.nextChunkIndex &&
              state.nextChunkIndex + 1 < state.totalChunks,
            to(
              'Uploading',
              state =>
                Uploading({
                  uploadId: state.uploadId,
                  nextChunkIndex: state.nextChunkIndex + 1,
                  totalChunks: state.totalChunks,
                }),
              state => [
                UploadChunk({
                  uploadId: state.uploadId,
                  chunkIndex: state.nextChunkIndex + 1,
                }),
              ],
            ),
          ),
          when(
            (state, message) => message.chunkIndex === state.nextChunkIndex,
            to(
              'Completing',
              state => Completing({ uploadId: state.uploadId }),
              state => [CompleteUpload({ uploadId: state.uploadId })],
            ),
          ),
        ],
        FailedChunk: [
          when(
            (state, message) => message.chunkIndex === state.nextChunkIndex,
            to('Failed', (_state, message) =>
              Failed({ reason: message.reason }),
            ),
          ),
        ],
        ClickedPause: to('Paused', state =>
          Paused({
            uploadId: state.uploadId,
            nextChunkIndex: state.nextChunkIndex,
            totalChunks: state.totalChunks,
          }),
        ),
      },
    },
    Paused: {
      on: {
        ClickedResume: to(
          'Uploading',
          state =>
            Uploading({
              uploadId: state.uploadId,
              nextChunkIndex: state.nextChunkIndex,
              totalChunks: state.totalChunks,
            }),
          state => [
            UploadChunk({
              uploadId: state.uploadId,
              chunkIndex: state.nextChunkIndex,
            }),
          ],
        ),
      },
    },
    Completing: {
      on: {
        SucceededComplete: to('Done', state =>
          Done({ uploadId: state.uploadId }),
        ),
        FailedComplete: to('Failed', (_state, message) =>
          Failed({ reason: message.reason }),
        ),
      },
    },
    Failed: {
      on: {
        ClickedUpload: to(
          'Creating',
          (_state, message) => Creating({ totalChunks: message.totalChunks }),
          (_state, message) => [
            CreateUpload({ totalChunks: message.totalChunks }),
          ],
        ),
      },
    },
  },
})

// TESTS

describe('resumable upload protocol', () => {
  it('emits the protocol commands step by step for a three chunk upload', () => {
    const [creating, createCommands] = uploadMachine.transition(
      Idle(),
      ClickedUpload({ totalChunks: 3 }),
    )
    expect(creating).toStrictEqual(Creating({ totalChunks: 3 }))
    expect(createCommands.map(command => command.name)).toEqual([
      'CreateUpload',
    ])

    const [uploadingFirst, firstChunkCommands] = uploadMachine.transition(
      creating,
      SucceededCreate({ uploadId: 'u1' }),
    )
    expect(uploadingFirst).toStrictEqual(
      Uploading({ uploadId: 'u1', nextChunkIndex: 0, totalChunks: 3 }),
    )
    expect(firstChunkCommands.map(command => command.args)).toEqual([
      { uploadId: 'u1', chunkIndex: 0 },
    ])

    const [uploadingSecond, secondChunkCommands] = uploadMachine.transition(
      uploadingFirst,
      SucceededChunk({ chunkIndex: 0 }),
    )
    expect(uploadingSecond).toStrictEqual(
      Uploading({ uploadId: 'u1', nextChunkIndex: 1, totalChunks: 3 }),
    )
    expect(secondChunkCommands.map(command => command.args)).toEqual([
      { uploadId: 'u1', chunkIndex: 1 },
    ])

    const [uploadingThird] = uploadMachine.transition(
      uploadingSecond,
      SucceededChunk({ chunkIndex: 1 }),
    )

    const [completing, completeCommands] = uploadMachine.transition(
      uploadingThird,
      SucceededChunk({ chunkIndex: 2 }),
    )
    expect(completing).toStrictEqual(Completing({ uploadId: 'u1' }))
    expect(completeCommands.map(command => command.name)).toEqual([
      'CompleteUpload',
    ])

    const [done] = uploadMachine.transition(completing, SucceededComplete())
    expect(done).toStrictEqual(Done({ uploadId: 'u1' }))
  })

  it('ignores duplicate and out of order chunk acknowledgements', () => {
    const uploading = Uploading({
      uploadId: 'u1',
      nextChunkIndex: 2,
      totalChunks: 5,
    })

    const duplicate = uploadMachine.step(
      uploading,
      SucceededChunk({ chunkIndex: 0 }),
    )
    expect(duplicate._tag).toBe('Ignored')

    const fromTheFuture = uploadMachine.step(
      uploading,
      SucceededChunk({ chunkIndex: 3 }),
    )
    expect(fromTheFuture._tag).toBe('Ignored')
  })

  it('does not advance the cursor when an acknowledgement races a pause', () => {
    const paused = Paused({ uploadId: 'u1', nextChunkIndex: 2, totalChunks: 5 })

    const racedAcknowledgement = uploadMachine.step(
      paused,
      SucceededChunk({ chunkIndex: 2 }),
    )
    expect(racedAcknowledgement._tag).toBe('Ignored')

    const [resumed, resumeCommands] = uploadMachine.transition(
      paused,
      ClickedResume(),
    )
    expect(resumed).toStrictEqual(
      Uploading({ uploadId: 'u1', nextChunkIndex: 2, totalChunks: 5 }),
    )
    expect(resumeCommands.map(command => command.args)).toEqual([
      { uploadId: 'u1', chunkIndex: 2 },
    ])
  })

  it('fails only on the chunk currently in flight', () => {
    const uploading = Uploading({
      uploadId: 'u1',
      nextChunkIndex: 2,
      totalChunks: 5,
    })

    const staleFailure = uploadMachine.step(
      uploading,
      FailedChunk({ chunkIndex: 1, reason: 'timeout' }),
    )
    expect(staleFailure._tag).toBe('Ignored')

    const [failed] = uploadMachine.transition(
      uploading,
      FailedChunk({ chunkIndex: 2, reason: 'timeout' }),
    )
    expect(failed).toStrictEqual(Failed({ reason: 'timeout' }))
  })
})
