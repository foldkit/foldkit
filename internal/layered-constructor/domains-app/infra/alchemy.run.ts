import * as Alchemy from 'alchemy'
import { Stage } from 'alchemy/Stage'
import { Effect } from 'effect'

import * as Cloudflare from '@alchemy.run/cloudflare'

export const Website = Cloudflare.Website.Foldkit(
  'Website',
  Effect.gen(function* () {
    const stage = yield* Stage

    return {
      rootDir: '..',
      ...(stage === 'preview' ? { domain: 'domains.foldkit.dev' } : {}),
      compatibility: {
        date: '2026-10-19',
        flags: [
          'nodejs_compat',
          'enable_request_signal',
          'request_signal_passthrough',
        ],
      },
      dev: { host: '127.0.0.1', port: 5195, strictPort: true },
    }
  }),
)

export default Alchemy.Stack(
  'FoldkitDomains',
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const website = yield* Website

    return { url: website.url }
  }),
)
