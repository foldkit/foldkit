import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './application'
import { HomeLive } from './page/home'
import { CopyableRoomIdLive } from './page/room/copyableRoomId'
import { JoinFormLive } from './page/room/joinForm'
import { RoomLive } from './page/room/room'
import { TypingLive } from './page/room/typing'
import { ApplicationLayer } from './services'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        HomeLive,
        RoomLive.pipe(
          Layer.provide(
            Layer.mergeAll(JoinFormLive, CopyableRoomIdLive, TypingLive),
          ),
        ),
      ),
    ),
    Layer.provide(ApplicationLayer),
  ),
  container: document.getElementById('root'),
  devTools: { dispatch: true, mode: 'TimeTravel' },
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
})

Runtime.run(program)
