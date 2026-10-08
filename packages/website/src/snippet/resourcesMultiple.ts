import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

const ServicesLive = Layer.mergeAll(
  ApiClientService.Default,
  AnalyticsService.Default,
  ComputeWorkerService.Default,
)

const Live = Layer.provide(
  Layer.mergeAll(LoadUserLive, TrackPageViewLive, ComputePreviewLive),
  ServicesLive,
)
Runtime.run(Application.provide(application, Live))
