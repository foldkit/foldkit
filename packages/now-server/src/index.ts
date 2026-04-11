import { HttpMiddleware, HttpRouter, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { RpcSerialization, RpcServer } from '@effect/rpc'
import { NowRpcs } from '@foldkit/now-shared'
import { Effect, Layer } from 'effect'
import { createServer } from 'node:http'

import { AppConfig } from './config.js'
import {
  authenticateWithPassphrase,
  beginAuthentication,
  beginRegisterPasskey,
  deletePasskey,
  finishAuthentication,
  finishRegisterPasskey,
  listRegisteredPasskeys,
  passkeyRegistrationStatus,
  subscribeStatusBanner,
  updateStatusBanner,
} from './handler/index.js'
import { makeRequestContextMiddleware } from './middleware.js'
import {
  BannerStore,
  BannerStoreLive,
  ChallengeStore,
  ChallengeStoreLive,
  PasskeyStore,
  PasskeyStoreLive,
  RpcRateLimiter,
  RpcRateLimiterLive,
  UpdateNonceTracker,
  UpdateNonceTrackerLive,
} from './store.js'

const NowLive = NowRpcs.toLayer(
  Effect.gen(function* () {
    const config = yield* AppConfig
    const bannerStore = yield* BannerStore
    const challengesRef = yield* ChallengeStore
    const updateNonceTracker = yield* UpdateNonceTracker
    const passkeyStore = yield* PasskeyStore

    return {
      beginAuthentication: beginAuthentication({
        config,
        challengesRef,
        passkeyStore,
      }),
      finishAuthentication: finishAuthentication({
        config,
        challengesRef,
        passkeyStore,
      }),
      authenticateWithPassphrase: authenticateWithPassphrase({ config }),
      updateStatusBanner: updateStatusBanner({
        config,
        updateNonceTracker,
        bannerStore,
      }),
      subscribeStatusBanner: subscribeStatusBanner(bannerStore.ref),
      passkeyRegistrationStatus: passkeyRegistrationStatus({
        config,
        passkeyStore,
      }),
      listRegisteredPasskeys: listRegisteredPasskeys({
        config,
        passkeyStore,
      }),
      beginRegisterPasskey: beginRegisterPasskey({
        config,
        challengesRef,
        passkeyStore,
      }),
      finishRegisterPasskey: finishRegisterPasskey({
        config,
        challengesRef,
        passkeyStore,
      }),
      deletePasskey: deletePasskey({ config, passkeyStore }),
    }
  }),
)

const RpcLayer = RpcServer.layer(NowRpcs).pipe(Layer.provide(NowLive))

const HttpProtocol = RpcServer.layerProtocolHttp({
  path: '/rpc',
}).pipe(Layer.provide(RpcSerialization.layerNdjson))

const SupportLayers = Layer.mergeAll(
  BannerStoreLive,
  ChallengeStoreLive,
  RpcRateLimiterLive,
  UpdateNonceTrackerLive,
  PasskeyStoreLive,
).pipe(Layer.provide(AppConfig.Default))

const makeServerLayer = Effect.gen(function* () {
  const config = yield* AppConfig
  const rpcRateLimiter = yield* RpcRateLimiter

  const corsMiddleware = HttpMiddleware.cors({
    allowedOrigins: [...config.corsOrigins],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: false,
    maxAge: 600,
  })

  const requestContextMiddleware = makeRequestContextMiddleware({
    rpcRateLimiter,
    auditIpSalt: config.auditIpSalt,
  })

  return HttpRouter.Default.serve(app =>
    requestContextMiddleware(corsMiddleware(app)),
  ).pipe(
    Layer.provide(RpcLayer),
    Layer.provide(HttpProtocol),
    Layer.provide(SupportLayers),
    Layer.provide(AppConfig.Default),
    HttpServer.withLogAddress,
    Layer.provide(NodeHttpServer.layer(createServer, { port: config.port })),
  )
})

const Main = makeServerLayer.pipe(
  Effect.provide(AppConfig.Default),
  Effect.provide(SupportLayers),
  Layer.unwrapEffect,
)

NodeRuntime.runMain(Layer.launch(Main))
