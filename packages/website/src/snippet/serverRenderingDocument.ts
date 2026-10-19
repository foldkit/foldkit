import { Server } from 'foldkit/experimental'

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, {
    head: '<link rel="icon" href="/favicon.svg">',
  })
