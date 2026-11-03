import { Array, Effect, Option } from 'effect'
import { HttpRouter } from 'effect/http'

import type { Page } from '@playwright/test'

import { DomainsRpcRoutes } from '../src/server/rpc'
import {
  Domain,
  DomainCandidateRange,
  domainCandidates,
  domainTlds,
} from '../src/shared/domain'
import { makeDomainFixtures } from '../src/shared/domain.fixture'
import {
  DOMAINS_RPC_PATH,
  DomainsRpcs,
  SearchError,
} from '../src/shared/domainsRpc'

export const mockDomainSearch = async (
  page: Page,
  search: (
    label: string,
    range: DomainCandidateRange,
  ) => Effect.Effect<ReadonlyArray<Domain>, SearchError> = label =>
    Effect.succeed(makeDomainFixtures(label)),
): Promise<void> => {
  const rpc = HttpRouter.toWebHandler(
    DomainsRpcRoutes.pipe(
      HttpRouter.provideRequest(
        DomainsRpcs.toLayer({
          SearchDomains: ({ label, offset = 0, limit = domainTlds.length }) =>
            search(label, { offset, limit }).pipe(
              Effect.map(domains =>
                Array.map(
                  Array.take(
                    Array.drop(domainCandidates(label), offset),
                    limit,
                  ),
                  name =>
                    Array.findFirst(
                      domains,
                      domain => domain.name === name.name,
                    ).pipe(Option.getOrElse(() => Domain.Unconfirmed(name))),
                ),
              ),
            ),
        }),
      ),
    ),
    { disableLogger: true },
  )
  page.once('close', () => {
    void rpc.dispose()
  })

  await page.route(`**${DOMAINS_RPC_PATH}{,/}`, async route => {
    const request = route.request()
    const response = await rpc.handler(
      new Request(request.url(), {
        method: request.method(),
        headers: request.headers(),
        body: request.postData(),
      }),
    )
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    })
  })
}
