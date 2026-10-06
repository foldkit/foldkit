import { Server } from 'foldkit/experimental'

export const renderDocument = Server.renderDocument

export const renderPage = async (): Promise<Server.EntryResult> =>
  Server.Responded(new Response(null, { status: 204 }))
