import { Option } from 'effect'
import { HttpRouter } from 'effect/http'
import { Url } from 'foldkit'
import { Server } from 'foldkit/experimental'

import { renderPage as renderApplicationPage } from '../client/entry.server'
import { DOMAINS_RPC_PATH } from '../shared/domainsRpc'
import { DomainsRpcLayer } from './rpc'

export { prerenderPaths, renderDocument } from '../client/entry.server'

const domainsRpc = HttpRouter.toWebHandler(DomainsRpcLayer, {
  disableLogger: true,
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => domainsRpc.dispose())
}

export const renderPage = (request: Request): Promise<Server.EntryResult> => {
  const isRpcRequest = Option.exists(
    Url.fromString(request.url),
    url =>
      url.pathname === DOMAINS_RPC_PATH ||
      url.pathname === `${DOMAINS_RPC_PATH}/`,
  )

  if (isRpcRequest) {
    return domainsRpc.handler(request).then(Server.Responded)
  } else {
    return renderApplicationPage(request)
  }
}
