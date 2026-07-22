import { Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const withoutOutMessage = (
  model: Model,
  commands: ReadonlyArray<Command.Command<Message>> = [],
): UpdateReturn => [model, commands, Option.none()]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ChangedDisplayName: ({ displayName }) =>
        withoutOutMessage(evo(model, { displayName: () => displayName })),
      ChangedBiography: ({ biography }) =>
        withoutOutMessage(evo(model, { biography: () => biography })),
      SubmittedProfileForm: () =>
        withoutOutMessage(evo(model, { saveState: () => Saving() }), [
          SaveProfile({
            displayName: model.displayName,
            biography: model.biography,
          }),
        ]),
      SucceededSaveProfile: ({ profile }) => [
        evo(model, { saveState: () => Idle() }),
        [],
        Option.some(SavedProfile({ profile })),
      ],
    }),
  )
