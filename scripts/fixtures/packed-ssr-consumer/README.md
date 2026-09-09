# Packed SSR consumer fixture

`check-packed-ssr-consumer.ts` copies this project into a temporary directory,
installs packed npm tarballs, and builds it without workspace aliases.

The driver generates `package.json` so the packed tarball paths and dependency
versions remain explicit. It substitutes named `{{...}}` tokens in the fixture
files. Every other consumer project file is copied without modification.

The files under `probes/` run in the browser but are not copied into the
consumer project. The page fragments under `pages/` extend rendered test pages.
