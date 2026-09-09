export type AsyncData<A, E> =
  | { readonly _tag: 'Idle' }
  | { readonly _tag: 'Loading' }
  | { readonly _tag: 'Refreshing'; readonly data: A }
  | { readonly _tag: 'Failure'; readonly error: E }
  | { readonly _tag: 'Stale'; readonly error: E; readonly data: A }
  | { readonly _tag: 'Success'; readonly data: A }
