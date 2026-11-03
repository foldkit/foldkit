# Preview release dispatch

Pushes to `codex/layers-and-submodels` do not publish packages or deploy the Website. To publish a preview, dispatch the existing Release workflow on that branch and provide the exact full commit SHA selected by the dispatch ref. The canary job checks that the input, `GITHUB_SHA`, and checked-out `HEAD` all match before running the publisher. The preview deployment waits for that canary and consumes its manifest artifact.

The same input remains the promoted `main` commit for manual stable-release finalization. Stable finalization and the stable Website deployment are restricted to `main`.
