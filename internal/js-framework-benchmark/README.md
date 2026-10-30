# @foldkit/js-framework-benchmark

The keyed Foldkit entry for [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark), built against the workspace packages. It derives from [Ryan Carniato's contribution](https://github.com/krausest/js-framework-benchmark/pull/2141).

The adapted `src/main.ts`, HTML entry, and build configuration are covered by the accompanying Apache 2.0 license. Changes to Ryan's entry include Command-based random generation, descriptive Message names, and Foldkit workspace build and installation support.

The entry uses a Schema-backed Model, exhaustive Message matching, keyed rows, and `createKeyedLazy` for each row. Random labels are generated in a Command through Effect's Random service. The update function reserves monotonically increasing row ids and applies the generated rows when the Command completes.

Row memoization uses `createKeyedLazy({ evict: 'AbsentFromRender' })` so removed row ids leave the cache after a successful render. The default `createKeyedLazy()` retains removed keys. The eviction option addresses the retention reported in [issue #1536](https://github.com/foldkit/foldkit/issues/1536).

## Build and install

Set up the Foldkit monorepo as described in the root README. Clone the upstream harness at the revision used for the comparison:

```sh
git clone https://github.com/krausest/js-framework-benchmark.git /tmp/js-framework-benchmark
git -C /tmp/js-framework-benchmark checkout ca8715d9ae84916fd24de3a79457d8c328f9b766
```

From the Foldkit repository root:

```sh
pnpm --filter foldkit --filter @foldkit/vite-plugin build
pnpm --filter @foldkit/js-framework-benchmark build
HARNESS_DIR=/tmp/js-framework-benchmark pnpm --filter @foldkit/js-framework-benchmark bench:install
```

The production build uses `@foldkit/vite-plugin`. The installer copies the bundle, HTML entry, and version metadata into `frameworks/keyed/foldkit`. It only replaces a target registered as `js-framework-benchmark-foldkit`. Other implementations are untouched.

The installed `package-lock.json` supplies version metadata to the harness. Its `-workspace` version suffix identifies an unreleased local build; record the source commit with the results. Build the entry from this workspace; the installed directory is not an npm project for rebuilding the source.

## Verify and run

Use Node 22.22.3 for the pinned harness. Its `.nvmrc` names Node 20.9, but its dependencies require Node 20.19 or newer. From the harness root, install the server and WebDriver dependencies and build the JavaScript comparison entries:

```sh
npm ci --legacy-peer-deps --ignore-scripts
npm run install-server
cd webdriver-ts
npm ci --ignore-scripts
npm run compile
cd ..
node cli.js rebuild-single --ci true --frameworks keyed/vanillajs-lite keyed/solid keyed/react-hooks keyed/svelte keyed/vue
mkdir -p frameworks/non-keyed
```

The pinned Elm build script calls `elm-tooling`, which is not declared as a dependency. Build with its installed Elm 0.19.1-6 compiler and the two minification steps from that script:

```sh
cd frameworks/keyed/elm
npm ci
mkdir -p dist
./node_modules/.bin/elm make src/Main.elm --optimize --output=dist/main.js
./node_modules/.bin/uglifyjs dist/main.js --compress 'pure_funcs="F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9",pure_getters=true,keep_fargs=false,unsafe_comps=true,unsafe=true,passes=2' -o dist/main.js
./node_modules/.bin/uglifyjs dist/main.js --mangle -o dist/main.js
cd ../../..
npm start
```

With the server running, use another terminal in the harness root. Set `CHROME_BINARY` to a fixed [Chrome for Testing](https://developer.chrome.com/docs/automation-and-testing/chrome-for-testing) executable. Chrome for Testing avoids automatic browser updates during collection. Finish builds and tests before starting the timing batch, and leave the machine idle until it completes:

```sh
npm run bench -- --framework keyed/vanillajs-lite keyed/solid keyed/react-hooks keyed/vue keyed/svelte keyed/elm keyed/foldkit --smoketest --headless --chromeBinary "$CHROME_BINARY"
cd webdriver-ts
npm run isKeyed -- --framework keyed/vanillajs-lite keyed/solid keyed/react-hooks keyed/vue keyed/svelte keyed/elm keyed/foldkit --headless --chromeBinary "$CHROME_BINARY"
npm run checkCSP -- keyed/vanillajs-lite keyed/solid keyed/react-hooks keyed/vue keyed/svelte keyed/elm keyed/foldkit --headless --chromeBinary "$CHROME_BINARY"
npm run bench -- --framework keyed/vanillajs-lite keyed/solid keyed/react-hooks keyed/vue keyed/svelte keyed/elm keyed/foldkit --benchmark 01_ 02_ 03_ 04_ 05_ 06_ 07_ 08_ 09_ --count 15 --chromeBinary "$CHROME_BINARY"
memory_pids=()
for memory_framework in vanillajs-lite solid react-hooks vue svelte elm foldkit; do
  npm run bench -- --framework "keyed/$memory_framework" --benchmark 21_ 22_ 25_ --count 5 --headless --chromeBinary "$CHROME_BINARY" > "memory-$memory_framework.log" 2>&1 &
  memory_pids+=("$!")
done
memory_failed=0
for memory_pid in "${memory_pids[@]}"; do
  if ! wait "$memory_pid"; then
    memory_failed=1
  fi
done
test "$memory_failed" -eq 0
```

The harness measures operations from browser traces, including rendering. The CPU timing run uses a visible browser. The separate memory pass uses seven isolated headless Chrome instances concurrently, one per entry. Check system memory pressure before and during the memory pass; this batch ran under normal pressure. CPU tests collect 15 samples each; selection adds 10 samples for a total of 25. Memory tests collect five post-GC samples in MiB using `performance.measureUserAgentSpecificMemory()`. The selected tests cover the nine CPU operations and ready, create, and repeated create/clear memory measurements. Read the pinned harness source for each operation's exact workload.

Optionally collect transfer sizes with the harness's default single sample:

```sh
npm run bench -- --framework keyed/vanillajs-lite keyed/solid keyed/react-hooks keyed/vue keyed/svelte keyed/elm keyed/foldkit --benchmark 40_ --chromeBinary "$CHROME_BINARY"
```

These commands produce local measurements. They are separate from the benchmark maintainer's published results. Record the harness commit, Foldkit commit, framework versions, browser version, machine, run count, and headless setting alongside the raw result files. Compare frameworks from the same run on the same machine.
