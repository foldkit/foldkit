# My Foldkit App

A server-rendered Foldkit application built with Effect.

## Getting Started

```bash
{{installCommand}}
{{devCommand}}
```

## Building and serving

```bash
{{buildCommand}}
{{startCommand}}
```

The build is one `vite build`. `@foldkit/vite-plugin` builds the client bundle
and the server bundle from that one command, and gives both the same build id.

`PORT` sets the port the server listens on. `ORIGIN` sets the public origin it
serves, which the server entry sees as `Request.url`; set it when deploying
behind a proxy or a TLS terminator. It defaults to `http://localhost:<PORT>`.

## The build id

The build id does not make hydration correct. It makes hydration refuse when it
would otherwise be incorrect.

The server stamps the id on the page, and the client bundle carries its own
copy. Hydration compares the two before it reads the Flags payload or adopts
DOM. When they differ, startup stops and the document body is marked `inert`,
`aria-hidden`, and `data-foldkit-refused`. A nondismissable modal shield covers
its controls and existing top-layer content, then takes focus without closing
author-owned dialogs. Nothing moves, so no custom element reconnects and no
frame reloads.

Without that check, stale HTML from an earlier deployment can be hydrated by the
newer client. Where the old markup happens to line up with the new markup,
an input the old page called `email` can be adopted for whatever the new build
puts in that position, carrying what the visitor typed into it.

The comparison happens when a client boots against a page. A tab whose client
is already running when a deployment lands is not rechecked.

`vite.config.ts` takes care of this: it reads `FOLDKIT_BUILD_ID` and generates
one when the variable is unset, storing it back so every later read of the
config resolves the same id. Vite reads the config once per environment it
builds, so a config that generated a fresh id each time would give the browser
bundle and the server bundle different ids. Supply `FOLDKIT_BUILD_ID` when the
build runs in separate jobs, or when you want the served id to name a
deployment you can look up later:

```bash
FOLDKIT_BUILD_ID="$CI_DEPLOYMENT_ID" {{buildCommand}}
```

The id is public HTML and must never contain a secret or be derived from one.
The client and server halves of one deployment must share an id. By contrast,
two deployments must never share one. Reusing an id produces no warning: the
ids agree, so hydration proceeds. When in doubt, leave `FOLDKIT_BUILD_ID` unset
and let the build generate one.

## Learn More

- [Foldkit Documentation](https://foldkit.dev)
- [Effect Documentation](https://effect.website)
