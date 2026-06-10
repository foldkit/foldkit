import { Layer } from 'effect'
import { Runtime } from 'foldkit'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  resources: Layer.mergeAll(
    AudioContextService.Default,
    WebRTCService.Default,
    CanvasService.Default,
  ),
})
