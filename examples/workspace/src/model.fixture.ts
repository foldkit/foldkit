import { Effect, Option } from 'effect'
import { Command, init, model, story } from 'foldkit/story'
import * as Url from 'foldkit/url'

import { LoadWorkspace } from './command'
import { initialWorkspace } from './domain'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import type { Model } from './model'

export const loadedWorkspaceModel = (path = '/') =>
  Effect.gen(function* () {
    let maybeLoadedModel = Option.none<Model>()

    yield* story(
      { block: ApplicationBlock, layer },
      init(Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      model(nextModel => {
        maybeLoadedModel = Option.some(nextModel)
      }),
    )

    return Option.getOrThrow(maybeLoadedModel)
  })
