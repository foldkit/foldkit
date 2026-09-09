import { Array, Effect, Option, Predicate, Schema, pipe } from 'effect'

import { HYDRATION_BUILD_ATTRIBUTE } from '../buildToken.js'
import {
  FOLDKIT_APP_ATTRIBUTE,
  FOLDKIT_FLAGS_ATTRIBUTE,
} from '../hydrationMarker.js'

/** Whether a boot adopts a server-rendered root (`Hydrate`) or builds the DOM
 *  fresh in the container (`Fresh`). */
export type BootMode = 'Fresh' | 'Hydrate'

// NOTE: the payload scripts are held as elements, not as their text. Reading
// the text is the first step of consuming another deployment's handoff, and the
// build id has not been compared yet at the point this runs.
export type HydrationConfig = Readonly<{
  root: HTMLElement
  runtimeId: string
  flagsScripts: ReadonlyArray<HTMLScriptElement>
  isFlagsRequired: boolean
}>

const hydrationForRoot = (
  root: HTMLElement,
  isFlagsRequired: boolean,
): HydrationConfig => {
  const runtimeId = root.getAttribute(FOLDKIT_APP_ATTRIBUTE) ?? ''
  const flagsScripts = pipe(
    Array.fromIterable(
      document.querySelectorAll<HTMLScriptElement>(
        `script[${FOLDKIT_FLAGS_ATTRIBUTE}]`,
      ),
    ),
    Array.filter(
      script => script.getAttribute(FOLDKIT_FLAGS_ATTRIBUTE) === runtimeId,
    ),
  )
  return { root, runtimeId, flagsScripts, isFlagsRequired }
}

// NOTE: hydration is scoped to the app's own stamped root so a server-rendered
// app never adopts another app's DOM. A container that carries the stamp is that
// root. A container that does not is a non-root element the caller resolved,
// which happens when the rendered view has its own element with the container's
// id (a descendant `id="root"`) and `getElementById` returned that inner element
// instead of the stamped root above it. That inner element resolves to the app
// root only when the page has exactly one stamped root and this container sits
// inside it. A container outside that root is a refused handoff, not a fresh
// application beside server markup that remains live. A null container is the
// replace-parity case, where the server root took the placeholder's place and
// `getElementById` no longer finds it, so the stamp is the only handle.
// A runtime id names one application for the whole page: it pairs a root with
// its Flags payload, and it keys the Model and scroll position hot reloading
// preserves. Two roots sharing one are not two applications but one claimed
// twice, so whichever boots second would read the other's handoff and restore
// the other's Model. `injectIntoTemplate` refuses to build such a page; this is
// the check for a page assembled some other way.
//
// Distinct ids do not make two hydrated applications independent, which is not
// a supported arrangement: each page-owning application rewrites the document's
// metadata and installs document-wide navigation listeners.
const assertRuntimeIdsAreUnique = (
  stampedRoots: ReadonlyArray<HTMLElement>,
): void => {
  const seen = new Set<string>()
  for (const root of stampedRoots) {
    const runtimeId = root.getAttribute(FOLDKIT_APP_ATTRIBUTE) ?? ''
    if (runtimeId === '') {
      containRefusedPage(root.ownerDocument)
      throw new Error(
        '[foldkit] Found a server-rendered root with an empty ' +
          `\`${FOLDKIT_APP_ATTRIBUTE}\` stamp. A hydratable root must carry ` +
          'a nonempty runtime id so the runtime can pair it with its Flags ' +
          'payload and preserved HMR state.',
      )
    }
    if (!root.ownerDocument.body?.contains(root)) {
      containRefusedPage(root.ownerDocument)
      throw new Error(
        '[foldkit] Found a server-rendered root outside the document body. ' +
          'Runtime.hydrate supports one page-owning application in the ' +
          'document light DOM. Do not hydrate a root in the head, a shadow ' +
          'tree, or a detached subtree.',
      )
    }
    if (seen.has(runtimeId)) {
      containRefusedPage(root.ownerDocument)
      throw new Error(
        `[foldkit] Found more than one server-rendered root stamped ` +
          `"${runtimeId}". A runtime id names one application for the whole ` +
          'page: it pairs a root with its Flags payload and keys the Model and ' +
          'scroll position hot reloading preserves, so two roots sharing one ' +
          "would take each other's state. Remove the duplicate root. Foldkit " +
          'hydrates one page-owning application per document.',
      )
    }
    seen.add(runtimeId)
  }
}

const assertSinglePageApplication = (
  stampedRoots: ReadonlyArray<HTMLElement>,
): void => {
  if (stampedRoots.length > 1) {
    containRefusedPage(document)
    throw new Error(
      '[foldkit] Found more than one page-owning application stamped with ' +
        `\`${FOLDKIT_APP_ATTRIBUTE}\`. Hydrating multiple applications in ` +
        'one document is not supported: each application owns the document ' +
        'metadata and installs document-wide navigation listeners. Render ' +
        'one application per page.',
    )
  }
}

// The reason this page cannot be adopted by this client, or `undefined` when
// the two name the same deployment.
//
// The client's id is required and must be non-empty. An absent one would
// otherwise equal the absent marker on a page served before build ids existed,
// which reads a page from an unknown deployment as one of this build's own: the
// exact case the id exists to refuse.
export const buildSkew = (
  root: HTMLElement,
  buildId: unknown,
  runtimeId: string,
): Error | undefined => {
  if (!Predicate.isString(buildId) || buildId === '') {
    return new Error(
      '[foldkit] Runtime.hydrate was given no build id. Hydration compares ' +
        'the id the server stamped on the root with this client’s own before ' +
        'it adopts any DOM, and without one a page from any deployment would ' +
        'be adopted as this one. Pass ' +
        '`buildId: import.meta.env.FOLDKIT_BUILD_ID`, the same value the ' +
        'server entry passes to `renderToString`.',
    )
  }
  const servedBuild = root.getAttribute(HYDRATION_BUILD_ATTRIBUTE)
  if (servedBuild === buildId) {
    return undefined
  }
  return new Error(
    `[foldkit] Runtime.hydrate found application "${runtimeId}" served by ` +
      `${servedBuild === null ? 'no known deployment' : `deployment "${servedBuild}"`}` +
      `, but this client belongs to deployment "${buildId}". Startup stops ` +
      'here rather than reading a handoff written by other code: the Flags in ' +
      'the page are that deployment’s, and this build could accept them while ' +
      'every value in them means something else. Serve the page from the ' +
      'running deployment, and keep stale HTML out of shared caches.',
  )
}

// Take the served page out of reach before startup stops.
//
// Refusing to adopt a page keeps this build's code away from it, but the markup
// is still a live document: its links navigate, its forms submit to whatever
// action the deployment that wrote them intended, and its controls take focus.
// A visitor who clicks after a failed handoff would be acting on a page with no
// running code to reconsider.
//
// The boundary is an element the served page already has, marked in place.
// Nothing moves. Wrapping the root in a fresh inert element would reparent it:
// every upgraded custom element in the subtree would run `disconnectedCallback`
// and then `connectedCallback` again, and every embedded browsing context would
// reload. Marking a stable ancestor costs neither.
//
// That ancestor is the document's body, which is where a hydratable root always
// sits: `renderToString` refuses to render `html`, `head`, or `body` as the
// root, and `hydrate` is for an application that owns the page. Inertness
// propagates from an inert HTML element to every descendant whatever their
// namespace, so an SVG or MathML root is covered too. `inert` is an HTML
// attribute, so marking such a root directly would only create an expando.
// Verified in Chromium for HTML, SVG foreign content, and MathML.
//
// A modal dialog lives in the top layer, where ancestor inertness does not reach
// it. The refusal shield is itself a modal dialog opened after the served page's
// top-layer content, so it covers an old dialog even inside a closed shadow
// root. It is a sibling of `body`, outside the inert and `aria-hidden` boundary,
// covers the viewport, and refuses its cancel action. Existing dialogs are not
// closed: calling author-owned `close` or `cancel` listeners while startup is
// failing can run arbitrary stale code. Same-document input guards stop
// physical keyboard input if older top-layer content requests focus.
//
// This runs when the client reaches the failure, so it cannot undo what the page
// already did: subresources the parser fetched, custom elements that upgraded,
// scripts the served deployment authored, or anything a visitor managed before
// the client entry ran. Nor is this a script sandbox. A capture listener on
// `window` or `document` runs before an event reaches the shield, and a timer or
// listener can open newer top-layer UI. The boundary stops pointer and physical
// keyboard input from activating the old page's same-document native links,
// forms, and controls without reconnecting its DOM.
const REFUSED_ATTRIBUTE = 'data-foldkit-refused'
const REFUSAL_SHIELD_ATTRIBUTE = 'data-foldkit-refusal-shield'
const refusalShields = new WeakMap<Document, HTMLDialogElement>()
const REFUSAL_SHIELD_INPUT_EVENTS: ReadonlyArray<keyof HTMLElementEventMap> = [
  'auxclick',
  'click',
  'contextmenu',
  'dblclick',
  'keydown',
  'keypress',
  'keyup',
  'mousedown',
  'mouseup',
  'pointerdown',
  'pointerup',
  'touchend',
  'touchstart',
]
const REFUSAL_DOCUMENT_INPUT_EVENTS: ReadonlyArray<keyof HTMLElementEventMap> =
  ['keydown', 'keypress', 'keyup']

const preventRefusalShieldInteraction = (event: Event): void => {
  event.preventDefault()
  event.stopImmediatePropagation()
}

// NOTE: `showModal` throws when the owning document is not fully active. A
// foreign or detached document still needs the original Foldkit refusal rather
// than a browser exception from its containment UI.
const tryOpenRefusalShieldAsModal = (shield: HTMLDialogElement): boolean => {
  if (typeof shield.showModal !== 'function') {
    return false
  }
  try {
    shield.showModal()
    return true
  } catch {
    return false
  }
}

const openRefusalShield = (shield: HTMLDialogElement): void => {
  shield.inert = true
  shield.setAttribute('inert', '')
  if (shield.open && typeof shield.close === 'function') {
    shield.close()
  }
  if (!tryOpenRefusalShieldAsModal(shield)) {
    shield.setAttribute('open', '')
  }
  shield.inert = false
  shield.removeAttribute('inert')
  shield.focus({ preventScroll: true })
}

const installRefusalShield = (ownerDocument: Document): void => {
  const existing = refusalShields.get(ownerDocument)
  if (existing !== undefined && existing.isConnected) {
    openRefusalShield(existing)
    return
  }

  const shield = ownerDocument.createElement('dialog')
  shield.setAttribute(REFUSAL_SHIELD_ATTRIBUTE, '')
  shield.setAttribute('aria-label', 'Page unavailable')
  shield.setAttribute('aria-modal', 'true')
  shield.setAttribute('closedby', 'none')
  shield.tabIndex = -1
  shield.textContent =
    'This page could not start safely. Reload to get the current version.'
  shield.style.alignItems = 'center'
  shield.style.background = 'rgba(15, 23, 42, 0.96)'
  shield.style.border = '0'
  shield.style.boxSizing = 'border-box'
  shield.style.color = 'white'
  shield.style.font = '600 1rem/1.5 system-ui, sans-serif'
  shield.style.display = 'grid'
  shield.style.height = '100vh'
  shield.style.inset = '0'
  shield.style.margin = '0'
  shield.style.maxHeight = 'none'
  shield.style.maxWidth = 'none'
  shield.style.overflow = 'hidden'
  shield.style.padding = '2rem'
  shield.style.position = 'fixed'
  shield.style.touchAction = 'none'
  shield.style.userSelect = 'none'
  shield.style.width = '100vw'
  shield.addEventListener('cancel', preventRefusalShieldInteraction)
  for (const eventName of REFUSAL_SHIELD_INPUT_EVENTS) {
    shield.addEventListener(eventName, preventRefusalShieldInteraction, {
      capture: true,
      passive: false,
    })
  }
  for (const eventName of REFUSAL_DOCUMENT_INPUT_EVENTS) {
    ownerDocument.addEventListener(eventName, preventRefusalShieldInteraction, {
      capture: true,
      passive: false,
    })
  }
  ownerDocument.documentElement.appendChild(shield)
  refusalShields.set(ownerDocument, shield)
  openRefusalShield(shield)
}

export const containRefusedPage = (ownerDocument: Document): void => {
  const boundary = ownerDocument.body ?? ownerDocument.documentElement
  boundary.inert = true
  boundary.setAttribute('inert', '')
  boundary.setAttribute('aria-hidden', 'true')
  boundary.setAttribute(REFUSED_ATTRIBUTE, '')
  installRefusalShield(ownerDocument)
}

// Whether this page carries anything a Foldkit server render leaves behind. A
// resolution failure on such a page is a refused handoff, and the markup is
// contained; the same failure on a page with none of these markers is a client
// application whose container never existed, where there is no server render to
// refuse and nothing to take out of reach.
export const hasServerRenderedMarkup = (ownerDocument: Document): boolean =>
  ownerDocument.querySelector(
    `[${FOLDKIT_APP_ATTRIBUTE}], [${HYDRATION_BUILD_ATTRIBUTE}], ` +
      `[${FOLDKIT_FLAGS_ATTRIBUTE}]`,
  ) !== null

export const findDocumentHydration = (
  container: HTMLElement | null,
  isFlagsRequired: boolean,
): HydrationConfig | undefined => {
  const stampedRoots = Array.fromIterable(
    document.querySelectorAll<HTMLElement>(`[${FOLDKIT_APP_ATTRIBUTE}]`),
  )
  assertRuntimeIdsAreUnique(stampedRoots)
  assertSinglePageApplication(stampedRoots)
  if (container !== null) {
    const stampedAncestor = container.closest<HTMLElement>(
      `[${FOLDKIT_APP_ATTRIBUTE}]`,
    )
    if (container.hasAttribute(FOLDKIT_APP_ATTRIBUTE)) {
      const isDocumentRoot = Option.match(Array.head(stampedRoots), {
        onNone: () => false,
        onSome: root => root === container,
      })
      if (!isDocumentRoot) {
        containRefusedPage(container.ownerDocument)
        throw new Error(
          '[foldkit] Runtime.hydrate received a stamped container that is ' +
            'not the single server root in the document light DOM. Hydration ' +
            'supports one page-owning application under the document body. ' +
            'Do not hydrate a root in a shadow tree or detached subtree.',
        )
      }
      return hydrationForRoot(container, isFlagsRequired)
    }
    return Array.match(stampedRoots, {
      onEmpty: () => {
        if (stampedAncestor === null) {
          return undefined
        }
        containRefusedPage(container.ownerDocument)
        throw new Error(
          '[foldkit] Runtime.hydrate received a container under a stamped ' +
            'root outside the document body light DOM. Do not hydrate a root ' +
            'in a shadow tree, detached subtree, or another document.',
        )
      },
      onNonEmpty: roots => {
        const onlyRoot = Array.headNonEmpty(roots)
        if (stampedAncestor === onlyRoot) {
          return hydrationForRoot(onlyRoot, isFlagsRequired)
        }
        containRefusedPage(container.ownerDocument)
        throw new Error(
          '[foldkit] Runtime.hydrate received a container outside the ' +
            "document's server-rendered application root. A page-owning " +
            'application must adopt that single root rather than boot beside ' +
            'server markup it does not own.',
        )
      },
    })
  }
  return Option.match(Array.head(stampedRoots), {
    onNone: () => undefined,
    onSome: root => hydrationForRoot(root, isFlagsRequired),
  })
}

/** What the boot takes from the handoff: the server-rendered root the first
 *  render adopts, when this boot adopts one, and the Effect that produces the
 *  Flags `init` runs with, from the page's payload or from the app's own
 *  Flags Effect. */
export type ResolvedHydrationHandoff<Flags> = Readonly<{
  maybeHydrationRoot: Option.Option<HTMLElement>
  resolveFlags: Effect.Effect<Flags>
}>

/**
 * Decides whether this boot adopts the server-rendered root and where its
 * Flags come from. A hydrating boot with no stamped root, a root served by
 * another deployment, or a missing, duplicated, or undecodable Flags
 * payload contains the served page and stops startup. The build id is
 * compared before the payload text is read and before `init` runs, so
 * nothing acts on another deployment's data. An HMR-restored Model skips
 * adoption and gets a fresh patch against the stamped root.
 */
export const resolveHydrationHandoff = <Flags, Resources>({
  bootMode,
  hydration,
  bootFlags,
  configuredFlags,
  isFlagsRequired,
  FlagsCodec,
  hmrModel,
  container,
  buildId,
  provideResources,
}: Readonly<{
  bootMode: BootMode
  hydration: HydrationConfig | undefined
  bootFlags: Effect.Effect<Flags, never, Resources> | undefined
  configuredFlags: Option.Option<Effect.Effect<Flags, never, Resources>>
  isFlagsRequired: boolean
  FlagsCodec: Schema.Codec<Flags, any, unknown, unknown>
  hmrModel: unknown
  container: HTMLElement
  buildId: string | undefined
  provideResources: <A>(
    effect: Effect.Effect<A, never, Resources>,
  ) => Effect.Effect<A>
}>): Effect.Effect<ResolvedHydrationHandoff<Flags>> =>
  Effect.gen(function* () {
    const maybeResolveFreshFlags = Option.orElse(
      Option.fromNullishOr(bootFlags),
      () => configuredFlags,
    )

    const resolveFreshFlags: Effect.Effect<Flags> = Option.match(
      maybeResolveFreshFlags,
      {
        onNone: () =>
          isFlagsRequired
            ? Effect.die(
                new Error(
                  '[foldkit] This application declares Flags. Pass its ' +
                    'Flags Effect to Runtime.run or Runtime.embed.',
                ),
              )
            : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              Effect.succeed(undefined as Flags),
        onSome: provideResources,
      },
    )

    // Every hydration refusal that knows which root it was going to adopt
    // contains that root first. The build id is one reason to refuse; a
    // missing, duplicated, malformed, or Schema-incompatible Flags payload
    // is another, and the page left behind is just as live in each case.
    const refuseHydration = <A>(
      root: Element,
      message: string,
      cause?: unknown,
    ): Effect.Effect<A> => {
      containRefusedPage(root.ownerDocument)
      return Effect.die(
        cause === undefined
          ? new Error(message)
          : new Error(message, { cause }),
      )
    }

    const decodeFlagsPayload = (
      payload: string,
      runtimeId: string,
      root: Element,
    ): Effect.Effect<Flags> =>
      Effect.try({
        try: () => {
          const parsedPayload: unknown = JSON.parse(payload)
          return pipe(
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            Schema.toCodecJson(FlagsCodec as Schema.Codec<Flags>),
            Schema.decodeUnknownSync,
            decode => decode(parsedPayload),
          )
        },
        catch: cause => cause,
      }).pipe(
        Effect.catch(cause =>
          refuseHydration<Flags>(
            root,
            '[foldkit] Runtime.hydrate could not decode the server ' +
              `Flags payload for application "${runtimeId}". The HTML ` +
              'and client bundle must use the same Flags Schema.',
            cause,
          ),
        ),
      )

    const maybeRequestedHydration =
      bootMode === 'Hydrate'
        ? Option.fromNullishOr(hydration)
        : Option.none<HydrationConfig>()

    if (bootMode === 'Hydrate' && Option.isNone(maybeRequestedHydration)) {
      // A hydrating client that finds no stamped root will not adopt
      // whatever the page holds, so the page is contained whether or not the
      // caller named a container.
      containRefusedPage(
        container === null ? document : container.ownerDocument,
      )
      return yield* Effect.die(
        new Error(
          '[foldkit] Runtime.hydrate could not find a server-rendered ' +
            `root stamped with \`${FOLDKIT_APP_ATTRIBUTE}\`. Use ` +
            'Runtime.run for a fresh client boot.',
        ),
      )
    }

    // The build the served page came from is settled here, before the Flags
    // payload text is accessed, parsed, or decoded, before `init` runs, and
    // therefore before any Command, Subscription, ManagedResource, or port
    // this boot would start. A page from another deployment carries that
    // deployment's Flags, which the current Schema may well accept while
    // every value in them means something else, so deferring the comparison
    // to the DOM patch lets stale data reach new code that already acted on
    // it.
    if (Option.isSome(maybeRequestedHydration)) {
      const skew = buildSkew(
        maybeRequestedHydration.value.root,
        buildId,
        maybeRequestedHydration.value.runtimeId,
      )
      if (skew !== undefined) {
        containRefusedPage(maybeRequestedHydration.value.root.ownerDocument)
        return yield* Effect.die(skew)
      }
    }

    // NOTE: an HMR-restored Model wins over DOM adoption because the
    // server DOM reflects older code. The hydration handoff is still
    // required, but the restored Model gets a fresh patch against its
    // stamped root.
    const maybeHydrationRoot: Option.Option<HTMLElement> =
      Predicate.isUndefined(hmrModel)
        ? Option.map(
            maybeRequestedHydration,
            requestedHydration => requestedHydration.root,
          )
        : Option.none()

    const maybeHydrationFlags: Option.Option<Flags> = yield* Option.match(
      maybeRequestedHydration,
      {
        onNone: () => Effect.succeed(Option.none()),
        onSome: requestedHydration =>
          Effect.map(
            requestedHydration.isFlagsRequired
              ? Array.match(requestedHydration.flagsScripts, {
                  onEmpty: () =>
                    refuseHydration(
                      requestedHydration.root,
                      '[foldkit] Runtime.hydrate found application ' +
                        `"${requestedHydration.runtimeId}" but its ` +
                        'server Flags payload is missing.',
                    ),
                  onNonEmpty: ([payloadScript, ...remainingScripts]) =>
                    Array.isArrayNonEmpty(remainingScripts)
                      ? refuseHydration(
                          requestedHydration.root,
                          '[foldkit] Runtime.hydrate found multiple ' +
                            'server Flags payloads for application ' +
                            `"${requestedHydration.runtimeId}".`,
                        )
                      : decodeFlagsPayload(
                          payloadScript.textContent ?? '',
                          requestedHydration.runtimeId,
                          requestedHydration.root,
                        ),
                })
              : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                Effect.succeed(undefined as Flags),
            Option.some,
          ),
      },
    )

    const resolveFlags: Effect.Effect<Flags> = Option.match(
      maybeHydrationFlags,
      {
        onNone: () => resolveFreshFlags,
        onSome: Effect.succeed,
      },
    )

    return { maybeHydrationRoot, resolveFlags }
  })
