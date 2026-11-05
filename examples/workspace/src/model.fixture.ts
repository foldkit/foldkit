import { Option } from 'effect'
import { Command, init, story } from 'foldkit/story'
import * as Url from 'foldkit/url'

import { LoadWorkspace } from './command'
import { initialWorkspace } from './domain'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'

export const loadedWorkspaceModel = (path = '/') =>
  story(
    { block: ApplicationBlock, layer },
    init(Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))),
    Command.resolve(
      LoadWorkspace,
      Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
    ),
  )
