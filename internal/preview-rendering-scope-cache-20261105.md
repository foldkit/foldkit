# Scoped view Context cache experiment

## Scope and artifacts

This bounded experiment started from worktree HEAD
`8131bafc76686790984d664bb87cbc6496ba23ec`. The frozen private baseline and
candidate source copies were identical except for `block/viewScope.ts` and the
candidate-only control test. The source hashes were:

- baseline `viewScope.ts`: `0b3b4f1d5160d118cddb54b5a7cc6e85798dc8d587138575d18f7539e0473528`
- cached `viewScope.ts`: `63c14df3ee1fe10d251a7c7dbe4cfd985baea50639f91fdcb1a79b25e431cb22`

The frozen source and profiling workspaces remain at:

- `/private/tmp/foldkit-scopeview-baseline-20261105`
- `/private/tmp/foldkit-scopeview-cache-20261105`
- `/private/tmp/foldkit-scopeview-profile-20261105`

The unchanged runner hash is
`6d26843332fa4b5bcd55def19f6219ac8d26a0db242c32bc54a2291a6a695ee1`.
Profiling covered runner lines 141 through 156: after the boot snapshot and
measurement reset, through the final quiet frame, before result aggregation.
Every run retained the unchanged 100-add, 100-toggle, 100-delete workload and
reported 400 synchronous and 400 animation-frame measurements. The write-once
receipt hash is
`eccf639b1385b86d16bd5534c34acfe2f1e42976b367d576f292b80c1e65afc8`.

The exact profile hashes are:

| Profile             | SHA-256                                                            |
| ------------------- | ------------------------------------------------------------------ |
| Baseline CPU        | `61355704b016ac88f4d1429a5ffebd345763cf8a8f0d5637115ada8e138b91ef` |
| Cache CPU           | `d8ab1706635a6a5be33970f0cc75884d1745d05d0bc2b287a09ad7a62b3692f0` |
| Baseline allocation | `5ceec0f9ea1158cddbe6382871e604c4260d5f630e4c14e78942ef3cce71203c` |
| Cache allocation    | `b68c088d49de4750e6a1cffaddd91cfb43792a4038d061c6cce39f7acfe004d6` |

## Target attribution

The measured root view reused one incoming Runtime Context and occurrence for
all 400 renders. The warmed cache removed every sampled call to
`makeInvocationContext` and its Effect Context construction from the measured
span.

Directly attributed CPU self time changed from 2.668 ms to 0.704 ms:

| Source              | Baseline |    Cache |
| ------------------- | -------: | -------: |
| `viewScope.ts`      | 1.523 ms | 0.704 ms |
| `scope.ts`          | 0.168 ms |     0 ms |
| Effect `Context.js` | 0.977 ms |     0 ms |

This is a 1.964 ms targeted reduction across 400 renders, or about 4.9 µs per
render. The inclusive `scopeView` stack changed from 19.105 ms to 16.164 ms,
but descendant differences are not all attributable to the cache.

Directly sampled allocation changed from 316.570 KiB to 153.438 KiB:

| Source              |    Baseline |       Cache |
| ------------------- | ----------: | ----------: |
| `viewScope.ts`      | 154.523 KiB | 153.438 KiB |
| `scope.ts`          |  70.922 KiB |       0 KiB |
| Effect `Context.js` |  91.125 KiB |       0 KiB |

The 163.132 KiB targeted reduction is the useful allocation evidence. The
whole allocation profiles changed from 16,512 samples and 18.071 MiB to 15,333
samples and 16.857 MiB, but unrelated sampled stacks prevent attributing the
entire difference to this change.

The optimized bundle changed from 472,364 to 472,701 bytes and from 145,314 to
145,438 bytes with Node `gzipSync`: 337 raw bytes and 124 gzip bytes.

## Noise and limits

The single balanced diagnostic pair is not an official timing comparison. Its
instrumented total changed from 64.35 ms to 58.80 ms, but the unchanged Mount
walk alone sampled at 9.133 ms and 6.333 ms. Its sampled allocation stayed
approximately flat at 761 and 776 KiB. The view body, VDOM traversal and
Snabbdom patch paths also moved in mixed directions. Those differences show
that the 5.55 ms whole-run change cannot be assigned to the Context cache.

The cache is therefore adopted only as a small, directly measured removal of
repeated Context and scoped interrupt-registry construction. It does not close
or explain the larger preview rendering gap. The final frozen 32-sample
comparison remains required.

## Safety proof

Focused controls retain a stable scoped Context while observing successive
Models, render-frame dispatchers and Ref values. They also prove invalidation
for a changed occurrence generation or replacement resource Context, isolation
across Runtime Contexts, and fresh historical Contexts through the real replay
path. Existing Mount and
runtime-frame tests retain owner, Mount, Binding, nested-frame and replay
validation. The cache fingerprints the cursor, node, generation, key and
resource Context identity; a miss performs the previous construction path.

The raw attribution is retained in
`/private/tmp/foldkit-scopeview-profile-20261105/profiles/analysis.json`, whose
SHA-256 is
`485eacc2897491cb2fff1d71c6694b72dd8c9d822f683445ff908c1cc6718b93`.
