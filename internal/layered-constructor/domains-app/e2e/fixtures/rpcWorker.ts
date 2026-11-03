import { HttpRouter } from 'effect/http'

import { DomainsRpcLayer } from '../../src/server/rpc'

const rpc = HttpRouter.toWebHandler(DomainsRpcLayer, {
  disableLogger: true,
})

export default {
  fetch(request: Request) {
    if (new URL(request.url).pathname === '/health') {
      return new Response('ok')
    } else {
      return rpc.handler(request)
    }
  },
}
