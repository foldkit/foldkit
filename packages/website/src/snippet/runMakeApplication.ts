import { Runtime } from 'foldkit'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  title: model => routeTitle(model.route),
  container: document.getElementById('root')!,
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(program)
