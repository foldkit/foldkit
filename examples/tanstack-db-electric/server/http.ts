import type { ServerResponse } from 'node:http'

export const writeJson = (
  response: ServerResponse,
  status: number,
  body: unknown,
): void => {
  response.statusCode = status
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify(body))
}
