import {
  Command,
  click,
  expectNoOutMessage,
  expectOutMessage,
  role,
  scene,
} from 'foldkit/scene'

import { it } from '@effect/vitest'

import { Note, NoteLive, Save } from './notes'

it.effect('asks its parent to delete the note', () =>
  scene(
    NoteLive,
    click(role('button', { name: 'Delete' })),
    expectOutMessage(Note.OutMessage.RequestedDelete()),
  ),
)

it.effect('saves without reporting to its parent', () =>
  scene(
    NoteLive,
    click(role('button', { name: 'Save' })),
    expectNoOutMessage(),
    Command.resolve(Save, Note.Message.SucceededSave()),
  ),
)
