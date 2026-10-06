import { Server } from 'foldkit/experimental'

export { prerenderPaths, renderPage } from '../build/entry.server'

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, {
    lang: 'fr',
    head: '<meta name="document-owner" content="server-entry">',
  })
