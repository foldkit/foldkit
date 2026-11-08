# Website readiness diagnostic

## Outcome

The bounded diagnostic did not reproduce the retained Website readiness failure. The only valid suite execution used the repository's real Playwright configuration with five workers, the existing retry and timeout policy, unchanged readiness assertions, and `trace=retain-on-failure`. All 22 tests passed on their first attempt in 124.511 seconds. There were no failed attempts, retries, skipped tests, unexpected results or flaky results. Port 38742 and the owned process scope were clean afterward.

This is a valid non-reproduction, not evidence that the earlier intermittent failure is fixed. Because no attempt failed, Playwright correctly produced no trace archive. The run therefore cannot distinguish delayed client compilation or module acquisition from a client runtime failure. It does not justify increasing the five-second assertion timeout, weakening or removing the SSR marker check, warming the client, reducing concurrency, or changing retry policy.

## What the marker proves

`waitForClientRuntime` first requires `[data-foldkit-build]` to disappear, then requires exactly one `[data-browser-environment-loaded]` marker. The first condition is the documented SSR handoff signal: Foldkit removes the server build stamp when the client runtime takes ownership of the page. The second condition proves the later browser-environment load completed and rendered its marker. A five-second failure of the first assertion proves only that client ownership was not observed within that assertion window. By itself it does not identify whether the client entry had not yet compiled or loaded, whether execution had not reached hydration, or whether execution failed before handoff.

The older retained traces contain successful retry attempts, not the failed first attempts, because the ordinary configuration retained traces on first retry. They show a large client module graph and extensive snippet-module activity on successful attempts. That makes cold compilation or acquisition contention a plausible hypothesis, but it is not causal evidence and this packet does not turn it into a defect diagnosis.

## Evidence sequence

### v1: external configuration setup failure

The authenticated preflight used the intended source, tools, five workers, unchanged timeouts and dedicated port. Playwright started predev and the configured server, then stopped before listing or executing tests because unchanged `globalSetup.ts` imported `BASE_URL` through the active external diagnostic config, which did not export that name. JSON results contain no suites or tests, the failed-test list is empty, and no trace or browser result exists. Cleanup completed and the port/process scope was clear.

This is setup evidence only. The v1 preparation manifest is `ccef18ab12d331debda1f60bd28ebab0fefe0a432161ba630a83e9be1781f313`; its run manifest is `9314ae61534d2dc8193df50b51c5e666cccf6146cd4451fef5c9f37e897ac0c5`.

### v2: corrected source wrapper, same loader failure

The v2 wrapper exported `BASE_URL`, and a separate direct import verified it and the expected configuration without starting a server or browser. Under Playwright's external-config loading, the unchanged relative global-setup import still produced the same missing-`BASE_URL` named-export failure before test execution. The evidence does not identify the loader's internal module transformation. JSON again contains no suites or tests, no failed-test identity and no trace. Cleanup completed.

This is also setup evidence only. The v2 preparation manifest is `77c0cdbf6d694d9bff02192e37cada7474636411bb1c28d931293707d4fd6c98`; its run manifest is `108ce4e72425789a228293ebbd9c1617eeee05b417e210a3b38a533fac619784`.

### v3 preparation: no external configuration wrapper

V3 used the actual repository config and documented CLI overrides. One initial preparation-script invocation encountered malformed JSON in its private source manifest and stopped before Playwright, the port check, output-directory creation, server, browser or discovery. It produced no Website evidence.

The retained `--list` proof then exited zero and discovered 22 tests in five files without starting a server or browser. Its original receipt says `list-proof-failed` only because the proof runner incorrectly required `stats.expected > 0`; Playwright list mode represents the 22 discovered tests as skipped while preserving them under nested suites and specs. The original receipt remains unchanged. A separate authenticated classification records the exact results/stdout/stderr hashes, the nested 22-test inventory and this post-check limitation. The dedicated port and scoped process inventory were clear.

### v3 suite: valid non-reproduction

The single authorized suite invocation used exact Node 26.13.0, Playwright 1.63.0 and Vite 8.3.5. The command selected the actual repository config and changed only trace retention, worker count, output directory and reporters through documented CLI options. The installed JSON reporter wrote to a separate path through `PLAYWRIGHT_JSON_OUTPUT_FILE`. Repository assertions, global setup, retries and timeouts were unchanged.

The JSON output contains exactly 22 result attempts, all with retry index zero and passed status. It contains no errors or attachments. `test-results` contains only `.last-run.json`, reporting pass with an empty failed-test array. With no failure, `retain-on-failure` generated no `trace.zip`; this is expected rather than missing evidence. The run receipt records exit zero and completed cleanup, and the independent cleanup check found no dedicated-port listener or scoped process.

## Practical next step

Do not repeat this sealed packet for a favorable outcome. The next discriminating evidence is a naturally recurring failed first attempt captured with failure retention. Inspect that failure's network and module timeline, browser console errors, and both marker states. That observation can distinguish delayed acquisition from execution failure without weakening the readiness contract. Until such a failure is captured, there is no evidence-backed Website source fix in this packet.

## Provenance and portability

`source-provenance.json` binds the diagnostic to canonical Git commit `c3ffef0cedd9401359105076038b867502960ea4` and tree `a2d925ca9fe2dfbbc3d509647627aa9f1079c4b1`; no duplicate source checkout is archived. `archive-inventory.json` records each stored archive's compressed and decompressed-tar hash and size. `evidence/raw-files.sha256` and `evidence/raw-files-bytes.txt` inventory all 53 original files under their original packet-relative paths. The three archives preserve those raw files byte-for-byte, including failed setup receipts, wrappers, configs, logs, list proof, final JSON results and cleanup evidence.

The original absolute commands and host paths remain inside raw receipts as execution provenance. For source readback after relocation, use the canonical Git commit and relative paths in `source-provenance.json`. This packet is evidence, not an instruction to rerun the sealed diagnostic.
