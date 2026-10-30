import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './runRoutedApplication'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  viewTransition: ({ message }) => message._tag === 'ChangedUrl',
})

Runtime.run(program)
