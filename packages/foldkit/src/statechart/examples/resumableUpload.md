# Resumable Upload Protocol

Code: `resumableUpload.test.ts` (`Idle | Creating | Uploading | Paused |
Completing | Done | Failed`, a chunked upload with pause and resume).

## The problem this solves

Protocol clients have a precise notion of legality: the server's responses
are only meaningful relative to where the client believes it is. The bug
class is "we accepted message X in state Y": a duplicate chunk
acknowledgement advancing the cursor twice, an acknowledgement for a chunk
the client never sent, a response racing a pause and mutating state the
pause was supposed to freeze. Hand-written update code tends to encode the
happy path and treat the rest as unreachable, which the network disproves.

## What the machine buys

- Legality is the table. `SucceededChunk` only matters in `Uploading`, and
  only when `message.chunkIndex === state.nextChunkIndex`. Duplicates,
  out-of-order acks, and acks from the future are all `Ignored`, asserted
  directly in the tests.
- The pause race is an explicit absent cell. `Paused` has no entry for
  `SucceededChunk`, so an acknowledgement that arrives after the user paused
  does not advance the cursor, and resume re-requests the same chunk. In
  hand-written code this behavior would be an accident of branch ordering;
  here it is a visible, reviewable decision (and changing the policy is
  adding one edge).
- The Commands attached to edges are the protocol's outbound actions, and
  because Commands carry their `args` as data, the test asserts the full
  request sequence (`CreateUpload`, `UploadChunk(0..2)`, `CompleteUpload`)
  step by step without mocking a transport. The machine plus its commands
  is effectively an executable sequence diagram.
- The advance-or-complete decision is an ordered guard pair on one message,
  mirroring how the spec would phrase it: more chunks means upload the next,
  last chunk means finalize.

## Honest limits

- Resume re-uploads the chunk that was in flight at pause time, which
  assumes chunk uploads are idempotent on the server. That assumption lives
  in the protocol, not the machine; the table just makes it visible.
- No timeout handling is shown. A real client would run a Subscription gated
  on the `Uploading` tag that dispatches a timeout Message, exactly like the
  backoff timer in the main spike's integration sketch.
- The fake Commands resolve synchronously; real ones need the services
  channel (`R`) the spike has not added.
