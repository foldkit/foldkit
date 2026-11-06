import { Option } from 'effect'
import { Story } from 'foldkit'
import * as Url from 'foldkit/url'

import { LoadWorkspace } from './command'
import { initialWorkspace } from './domain'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'

export const loadedWorkspaceModel = (path = '/') =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.init(
      Option.getOrThrow(Url.fromString(`https://workspace.test${path}`)),
    ),
    Story.Command.resolve(
      LoadWorkspace,
      Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
    ),
  )
