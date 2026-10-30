import { Array, Effect, Layer, Schema } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import {
  Command as SceneCommand,
  click,
  role,
  expect as sceneExpect,
  text,
} from '../test/scene.js'
import { Command as StoryCommand, message, model } from '../test/story.js'
import { Block, deliver } from './block.js'
import { scene, story } from './testing.js'

const NoteMessage = defineMessageUnion({
  ClickedSave: {},
  SucceededSave: {},
  FailedSave: { reason: Schema.String },
})

const Save = Command.define('Save', {
  args: { body: Schema.String },
  messages: [NoteMessage.SucceededSave, NoteMessage.FailedSave],
})

class Note extends Block<Note>()('Note', {
  Model: Schema.Struct({ status: Schema.String }),
  Message: NoteMessage,
  Command: [Save],
}) {}

const NoteLive = Note.make(
  Effect.fn(function* (id) {
    return {
      model: { status: 'Idle' },
      update: {
        ClickedSave: model => ({
          model,
          commands: [Save({ body: 'draft' })],
        }),
        SucceededSave: () => ({ model: { status: 'Saved' } }),
        FailedSave: (_model, { reason }) => ({ model: { status: reason } }),
      },
      commands: {
        Save: () => Effect.succeed(Note.Message.SucceededSave()),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.button([h.OnClick(Note.Message.ClickedSave())], [`Save ${id}`]),
            h.p([], [`${id}: ${model.status}`]),
          ],
        ),
    }
  }),
)

class Notes extends Block<Notes>()('Notes', {
  Model: Schema.Struct({
    left: Note,
    right: Note,
    rows: Schema.Array(Note),
  }),
  Message: defineMessageUnion({ ClickedAddRow: {} }),
}) {}

const NotesLive = Notes.make(
  Effect.fn(function* () {
    const left = yield* new Note('left')
    const right = yield* new Note('right')
    const row = yield* Note.each('rows')

    return {
      model: { left, right, rows: [] },
      update: {
        ClickedAddRow: model => ({
          model: {
            ...model,
            rows: Array.append(model.rows, row(`row-${model.rows.length}`)),
          },
        }),
      },
      view: (model, h) => h.div([], [model.left.view(), model.right.view()]),
    }
  }),
).pipe(Layer.provide(NoteLive))

const saveBoth = [
  message(deliver(Note, 'left', Note.Message.ClickedSave())),
  message(deliver(Note, 'right', Note.Message.ClickedSave())),
]

describe('Command.at', () => {
  it.effect(
    'resolves one instance when siblings have identical pending Commands',
    () =>
      story(
        NotesLive,
        ...saveBoth,
        StoryCommand.expectHas(
          StoryCommand.at('left', Save({ body: 'draft' })),
          StoryCommand.at('right', Save({ body: 'draft' })),
        ),
        StoryCommand.resolve(
          StoryCommand.at('right', Save({ body: 'draft' })),
          Note.Message.FailedSave({ reason: 'offline' }),
        ),
        model(model => {
          expect(model.left.status).toBe('Idle')
          expect(model.right.status).toBe('offline')
        }),
        StoryCommand.resolve(
          StoryCommand.at('left', Save),
          Note.Message.SucceededSave(),
        ),
        model(model => expect(model.left.status).toBe('Saved')),
        StoryCommand.expectNone(),
      ),
  )

  it('reports ambiguity when no instance is selected', () => {
    expect(() =>
      Effect.runSync(
        story(
          NotesLive,
          ...saveBoth,
          StoryCommand.resolve(Save, Note.Message.SucceededSave()),
        ),
      ),
    ).toThrow('multiple pending Commands match')
  })

  it.effect('selects keyed instances by collection and key', () =>
    story(
      NotesLive,
      message(Notes.Message.ClickedAddRow()),
      message(Notes.Message.ClickedAddRow()),
      message(deliver(Note, ['rows', 'row-0'], Note.Message.ClickedSave())),
      message(deliver(Note, ['rows', 'row-1'], Note.Message.ClickedSave())),
      StoryCommand.resolveAll(
        [
          StoryCommand.at(['rows', 'row-1'], Save),
          Note.Message.FailedSave({ reason: 'conflict' }),
        ],
        [
          StoryCommand.at(['rows', 'row-0'], Save),
          Note.Message.SucceededSave(),
        ],
      ),
      model(model =>
        expect(Array.map(model.rows, ({ status }) => status)).toEqual([
          'Saved',
          'conflict',
        ]),
      ),
    ),
  )

  it.effect('matches nothing at a path with no such Command', () =>
    story(
      NotesLive,
      message(deliver(Note, 'left', Note.Message.ClickedSave())),
      StoryCommand.expectHas(StoryCommand.at('left', Save)),
      model(() => {
        expect(() =>
          Effect.runSync(
            story(
              NotesLive,
              message(deliver(Note, 'left', Note.Message.ClickedSave())),
              StoryCommand.resolve(
                StoryCommand.at('right', Save),
                Note.Message.SucceededSave(),
              ),
            ),
          ),
        ).toThrow('Save at ["right"]')
      }),
      StoryCommand.resolve(Save, Note.Message.SucceededSave()),
      model(model => expect(model.left.status).toBe('Saved')),
    ),
  )

  it.effect('selects an instance in a Scene', () =>
    scene(
      NotesLive,
      click(role('button', { name: 'Save right' })),
      SceneCommand.expectHas(SceneCommand.at('right', Save)),
      SceneCommand.resolve(
        SceneCommand.at('right', Save),
        Note.Message.FailedSave({ reason: 'offline' }),
      ),
      sceneExpect(text('left: Idle')).toExist(),
      sceneExpect(text('right: offline')).toExist(),
    ),
  )
})
