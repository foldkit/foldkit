---
'foldkit': minor
---

Decode a CustomElement event's `detail` through its declared Schema before
dispatching. A CustomElement declares its events with Schema and the generated
`On{Event}` factory is typed to hand your callback the decoded detail.
Previously the runtime forwarded `event.detail` raw without decoding, so the
type promised a validated value the runtime never checked. The factory now runs
`Schema.decodeUnknownOption` on `event.detail` and dispatches a Message only on
a successful decode, matching the decode-and-drop pattern used for a
non-conforming Subscription event.

This is a behavioral change: an event whose `detail` fails to decode (wrong
shape, missing field, wrong type) is now dropped silently instead of
dispatching a Message built from unchecked data. The `events` record passed to
`CustomElement.define` is now typed as decodable schemas (`Schema.Codec`) so
decoding requires no Effect services and stays synchronous inside event
dispatch.
