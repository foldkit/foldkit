// oxlint-disable typescript/consistent-type-assertions
import { Array, Context, Effect, Predicate, Record, Schema } from 'effect'
import type { Simplify } from 'effect/Types'
import { HttpClientError } from 'effect/unstable/http'
import { HttpApiMiddleware, HttpApiSchema } from 'effect/unstable/httpapi'
import type * as HttpApi from 'effect/unstable/httpapi/HttpApi'
import * as HttpApiClient from 'effect/unstable/httpapi/HttpApiClient'
import * as HttpApiEndpoint from 'effect/unstable/httpapi/HttpApiEndpoint'
import * as HttpApiGroup from 'effect/unstable/httpapi/HttpApiGroup'

import { define } from './define.js'
import { type KeyedQuery, type SyncFields, encodeKey } from './keyedQuery.js'
import type { Query } from './query.js'

type EndpointFrom<
  Groups extends HttpApiGroup.Constraint,
  GroupId extends HttpApiGroup.Identifier<Groups>,
  EndpointId extends string,
  Group extends HttpApiGroup.Constraint = HttpApiGroup.WithIdentifier<
    Groups,
    GroupId
  >,
  Endpoint extends HttpApiEndpoint.Constraint = HttpApiEndpoint.WithIdentifier<
    HttpApiGroup.Endpoints<Group>,
    EndpointId
  >,
> = Endpoint

type ClientRequestOf<Endpoint> =
  Endpoint extends HttpApiEndpoint.ConstraintRequest
    ? Simplify<
        HttpApiEndpoint.ClientRequest<
          Endpoint['~Params'],
          Endpoint['~Query'],
          Endpoint['~Payload'],
          Endpoint['~Headers'],
          'decoded-only'
        >
      >
    : never

type RequestBody<Request> = Omit<
  Extract<Request, object>,
  'responseMode' | 'sseOptions'
>

type EndpointSuccess<Endpoint> = Endpoint extends {
  readonly '~Success': infer S extends Schema.Constraint
}
  ? S['Type']
  : unknown
type EndpointSuccessEncoded<Endpoint> = Endpoint extends {
  readonly '~Success': infer S extends Schema.Constraint
}
  ? S['Encoded']
  : unknown

export class SchemaError extends Schema.TaggedError<SchemaError>(
  'Query/HttpApi/SchemaError',
)('SchemaError', {
  message: Schema.String,
}) {
  static readonly fromSchemaError = (error: Schema.SchemaError): SchemaError =>
    SchemaError.make({ message: error.message })
}

export class HttpApiClientError extends Schema.TaggedError<HttpApiClientError>(
  'Query/HttpApi/HttpApiClientError',
)('HttpApiClientError', {
  reason: Schema.Union([HttpClientError.HttpClientErrorSchema, SchemaError]),
}) {}

type EndpointError<Endpoint> =
  Endpoint extends HttpApiEndpoint.ConstraintRequest
    ?
        | Endpoint['~Error']['Type']
        | HttpApiMiddleware.Error<Endpoint['~Middleware']>
        | HttpApiClientError
    : unknown
type EndpointErrorEncoded<Endpoint> =
  Endpoint extends HttpApiEndpoint.ConstraintRequest
    ?
        | Endpoint['~Error']['Encoded']
        | HttpApiMiddleware.ErrorSchema<Endpoint['~Middleware']>['Encoded']
        | (typeof HttpApiClientError)['Encoded']
    : unknown

type IsEmptyRequest<Request> = [RequestBody<Request>] extends [never]
  ? true
  : [keyof RequestBody<Request>] extends [never]
    ? true
    : false

type SchemaServices<S> = S extends Schema.Constraint
  ? S['DecodingServices'] | S['EncodingServices']
  : never

type SuccessServices<Endpoint> = Endpoint extends {
  readonly '~Success': infer S extends Schema.Constraint
}
  ? SchemaServices<S>
  : never

type RequestServices<Endpoint> =
  Endpoint extends HttpApiEndpoint.ConstraintRequest
    ?
        | SchemaServices<Endpoint['~Params']>
        | SchemaServices<Endpoint['~Query']>
        | SchemaServices<Endpoint['~Headers']>
        | SchemaServices<Endpoint['~Payload']>
    : never

type UnwrapHeaders<S> =
  S extends HttpApiSchema.WithHeaders<
    infer Inner extends Schema.Top,
    infer _Headers extends Schema.Top
  >
    ? UnwrapHeaders<Inner>
    : S

type IsStreamSuccess<S> =
  UnwrapHeaders<S> extends HttpApiSchema.StreamSse<
    infer _Events,
    infer _Error,
    infer _Value
  >
    ? true
    : UnwrapHeaders<S> extends HttpApiSchema.StreamUint8Array
      ? true
      : false

type QueryableEndpoint<Endpoint> = Endpoint extends {
  readonly '~Success': infer S extends Schema.Constraint
}
  ? [IsStreamSuccess<S>] extends [true]
    ? never
    : [SuccessServices<Endpoint> | RequestServices<Endpoint>] extends [never]
      ? [
          | HttpApiEndpoint.ErrorServicesDecode<Endpoint>
          | HttpApiEndpoint.ErrorServicesEncode<Endpoint>,
        ] extends [never]
        ? Endpoint
        : never
      : never
  : never

type EndpointIdOf<
  Groups extends HttpApiGroup.Constraint,
  GroupId extends HttpApiGroup.Identifier<Groups>,
  Endpoints extends HttpApiEndpoint.Constraint = HttpApiGroup.Endpoints<
    HttpApiGroup.WithIdentifier<Groups, GroupId>
  >,
> = Endpoints extends infer Endpoint extends HttpApiEndpoint.Constraint
  ? [QueryableEndpoint<Endpoint>] extends [never]
    ? never
    : HttpApiEndpoint.Identifier<Endpoint>
  : never

type ClientRequestFields<Endpoint extends HttpApiEndpoint.ConstraintRequest> =
  Simplify<
    ([Endpoint['~Params']['Type']] extends [never]
      ? {}
      : { readonly params: Endpoint['~Params'] }) &
      ([Endpoint['~Query']['Type']] extends [never]
        ? {}
        : { readonly query: Endpoint['~Query'] }) &
      ([Endpoint['~Headers']['Type']] extends [never]
        ? {}
        : { readonly headers: Endpoint['~Headers'] }) &
      ([Endpoint['~Payload']['Type']] extends [never]
        ? {}
        : { readonly payload: Endpoint['~Payload'] })
  >

type InferredFields<Endpoint> =
  Endpoint extends HttpApiEndpoint.ConstraintRequest
    ? ClientRequestFields<Endpoint> extends SyncFields
      ? ClientRequestFields<Endpoint>
      : never
    : never

type KeyedRequestArgs<Endpoint> = RequestBody<ClientRequestOf<Endpoint>>

type KeyedQueryOptions<Endpoint> = {
  readonly toKey?: (args: KeyedRequestArgs<Endpoint>) => string
}

interface QueryFrom<Self, Groups extends HttpApiGroup.Constraint> {
  <
    Name extends string,
    const GroupId extends HttpApiGroup.Identifier<Groups>,
    const EndpointId extends EndpointIdOf<Groups, GroupId>,
    Endpoint extends EndpointFrom<Groups, GroupId, EndpointId> = EndpointFrom<
      Groups,
      GroupId,
      EndpointId
    >,
    Fields extends SyncFields = InferredFields<Endpoint> extends SyncFields
      ? InferredFields<Endpoint>
      : SyncFields,
  >(
    name: Name,
    group: GroupId,
    endpoint: EndpointId,
    ...options: IsEmptyRequest<ClientRequestOf<Endpoint>> extends true
      ? []
      : [options?: KeyedQueryOptions<Endpoint>]
  ): IsEmptyRequest<ClientRequestOf<Endpoint>> extends true
    ? Query<
        Name,
        EndpointSuccess<Endpoint>,
        EndpointSuccessEncoded<Endpoint>,
        EndpointError<Endpoint>,
        EndpointErrorEncoded<Endpoint>,
        Self
      >
    : KeyedQuery<
        Name,
        EndpointSuccess<Endpoint>,
        EndpointSuccessEncoded<Endpoint>,
        EndpointError<Endpoint>,
        EndpointErrorEncoded<Endpoint>,
        Fields,
        Self
      >
}

/**
 * A class-style `Context.Service` whose value is `HttpApiClient.Client<Groups>`.
 * `.query` turns a group/endpoint into a Query or KeyedQuery Submodel.
 *
 * @example
 * ```ts
 * class BlogClient extends Query.HttpApi.Service<BlogClient>()("BlogClient", { api: BlogApi }) {}
 * const postsQuery = BlogClient.query("Posts", "blog", "listPosts")
 * const postQuery = BlogClient.query("Post", "blog", "getPost")
 * ```
 */
export interface Service<
  Self,
  Id extends string,
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
> extends Context.Service<Self, HttpApiClient.Client<Groups>> {
  new (_: never): Context.ServiceClass.Shape<Id, HttpApiClient.Client<Groups>>
  readonly api: HttpApi.HttpApi<ApiId, Groups>
  readonly query: QueryFrom<Self, Groups>
}

interface QueryTag<
  Self,
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
> extends Context.Service<Self, HttpApiClient.Client<Groups>> {
  readonly api: HttpApi.HttpApi<ApiId, Groups>
}

function getPayloadSchemas(endpoint: HttpApiEndpoint.Top): Array<Schema.Top> {
  const result: Array<Schema.Top> = []
  for (const { schemas } of endpoint.payload.values()) {
    result.push(...schemas)
  }
  return result
}

function getSuccessSchemas(
  endpoint: HttpApiEndpoint.Top,
): [Schema.Top, ...Array<Schema.Top>] {
  const schemas = globalThis.Array.from(endpoint.success)
  return Array.isArrayNonEmpty(schemas) ? schemas : [HttpApiSchema.NoContent]
}

function getErrorSchemas(endpoint: HttpApiEndpoint.Top): Array<Schema.Top> {
  const schemas = new Set<Schema.Top>(endpoint.error)
  for (const middleware of endpoint.middlewares) {
    const key = middleware as HttpApiMiddleware.AnyService
    for (const schema of key.error) {
      schemas.add(schema)
    }
  }
  return globalThis.Array.from(schemas)
}

const isTopLevelGroup = (group: HttpApiGroup.Constraint): boolean =>
  Predicate.hasProperty(group, 'topLevel') && group.topLevel === true

const successCodec = (
  endpoint: HttpApiEndpoint.Top,
): Schema.Codec<unknown, unknown> =>
  Schema.Union(getSuccessSchemas(endpoint)) as never

function errorCodec(
  endpoint: HttpApiEndpoint.Top,
): Schema.Codec<unknown, unknown> {
  const schemas: Array<Schema.Codec<unknown, unknown>> = getErrorSchemas(
    endpoint,
  ) as never

  return Schema.Union([...schemas, HttpApiClientError])
}

function payloadCodec(endpoint: HttpApiEndpoint.Top): Schema.Top | undefined {
  const schemas = getPayloadSchemas(endpoint)
  if (Array.isArrayEmpty(schemas)) {
    return undefined
  }
  return Schema.Union(schemas)
}

function clientRequestFields(
  endpoint: HttpApiEndpoint.Top,
): SyncFields | undefined {
  const fields: globalThis.Record<string, Schema.Top> = {}
  if (endpoint.params !== undefined) {
    fields['params'] = endpoint.params
  }
  if (endpoint.query !== undefined) {
    fields['query'] = endpoint.query
  }
  if (endpoint.headers !== undefined) {
    fields['headers'] = endpoint.headers
  }
  const payload = payloadCodec(endpoint)
  if (payload !== undefined) {
    fields['payload'] = payload
  }
  if (Record.isEmptyRecord(fields)) return undefined

  return fields as never
}

const makeQuery = <
  Self,
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
>(
  tag: QueryTag<Self, ApiId, Groups>,
): QueryFrom<Self, Groups> =>
  function query<
    GroupId extends HttpApiGroup.Identifier<Groups>,
    EndpointId extends HttpApiEndpoint.Identifier<
      HttpApiGroup.Endpoints<HttpApiGroup.WithIdentifier<Groups, GroupId>>
    >,
  >(
    name: string,
    groupId: GroupId,
    endpointId: EndpointId,
    options?: {
      readonly toKey?: (args: unknown) => string
    },
  ) {
    const group = tag.api.groups[groupId] as HttpApiGroup.WithIdentifier<
      Groups,
      GroupId
    >
    const endpoint = group.endpoints[endpointId] as HttpApiEndpoint.Top

    const data = successCodec(endpoint)
    const error = errorCodec(endpoint)
    function mapError<A, E, R>(
      effect: Effect.Effect<
        A,
        E | Schema.SchemaError | HttpClientError.HttpClientError,
        R
      >,
    ): Effect.Effect<A, E | HttpApiClientError, R> {
      return effect.pipe(
        Effect.mapError(function (e) {
          if (Schema.isSchemaError(e))
            return HttpApiClientError.make({
              reason: SchemaError.fromSchemaError(e),
            })

          if (HttpClientError.isHttpClientError(e))
            return HttpApiClientError.make({
              reason:
                HttpClientError.HttpClientErrorSchema.fromHttpClientError(e),
            })

          return e
        }),
      )
    }

    function execute(request?: unknown) {
      return tag
        .use(function (client: any) {
          const clientMethod: HttpApiClient.Client.Method<
            HttpApiEndpoint.ConstraintRequest,
            unknown,
            unknown
          > = isTopLevelGroup(group)
            ? client[endpointId]
            : client[group.identifier][endpointId]
          const args: any = request === undefined ? {} : request
          return clientMethod(args)
        })
        .pipe(mapError)
    }

    const args = clientRequestFields(endpoint)
    if (args === undefined)
      return define({
        name,
        data,
        error,
        execute: execute(),
      })

    return define({
      name,
      data,
      error,
      args,
      toKey: options?.toKey || encodeKey(Schema.Struct(args)),
      execute,
    })
  } as QueryFrom<Self, Groups>

/**
 * Builds a class-style HttpApi service tag. Extend it, then call `.query`.
 *
 * Empty client request (no params, query, payload, or headers) is a Query.
 * Anything else is KeyedQuery. KeyedQuery args are the HttpApiClient request. Args
 * schemas are `Schema.Codec`s (no encoding or decoding services). Omit `toKey`
 * to JSON-encode args. Slot key and Interrupt identity share that function.
 *
 * @example
 * ```ts
 * class BlogClient extends Query.HttpApi.Service<BlogClient>()("BlogClient", { api: BlogApi }) {}
 * const postsQuery = BlogClient.query("Posts", "blog", "listPosts")
 * const postQuery = BlogClient.query("Post", "blog", "getPost")
 * ```
 */
export const Service = <Self>() =>
  function <
    const Id extends string,
    ApiId extends string,
    Groups extends HttpApiGroup.Constraint,
  >(
    id: Id,
    options: { readonly api: HttpApi.HttpApi<ApiId, Groups> },
  ): Service<Self, Id, ApiId, Groups> {
    const tag = Context.Service<Self, HttpApiClient.Client<Groups>>()(id)
    const withApi = Object.assign(tag, { api: options.api })
    return Object.assign(withApi, { query: makeQuery(withApi) })
  }
