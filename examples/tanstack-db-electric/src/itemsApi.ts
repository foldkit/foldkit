import { Option, Schema } from 'effect'

import { type ItemsMutation, ItemsMutationResult } from './domain'

const ErrorResponse = Schema.Struct({ error: Schema.String })

export const persistItemsMutation = async (
  mutation: ItemsMutation,
): Promise<ItemsMutationResult> => {
  const response = await fetch('/api/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mutation),
  })
  const responseBody: unknown = await response.json()

  if (!response.ok) {
    const maybeError = Schema.decodeUnknownOption(ErrorResponse)(responseBody)
    throw new Error(
      Option.match(maybeError, {
        onNone: () => `Request failed with status ${response.status}`,
        onSome: ({ error }) => error,
      }),
    )
  }

  return Schema.decodeUnknownPromise(ItemsMutationResult)(responseBody)
}
