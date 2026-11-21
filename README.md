# ACRYL terminal

The ACRYL terminal coding agent (`acryl-cli`) and the earlier ACRYL browser surface (`acryl-web`), with the container image that serves the browser surface.

**The main entry to ACRYL is now ACRYL Control Center: run `npx acryl`.** It opens in this terminal, in a window (`--gui`) or in the browser (`--web`), and it opens this terminal agent for you when you ask for it (`acryl ade --tui`). This repository is where that agent and the earlier browser surface are built and released.

## What is here

| Folder | What it is |
| --- | --- |
| `apps/acryl-cli` | The terminal coding agent: a pi-tui client on the DeepSeek Harness, with the ACRYL plugin market, login and model screens, and the `acryl save` and `acryl ui` commands. |
| `apps/acryl-web` | The earlier browser surface: the ACRYL workspace (files, terminals, agents, chat) served on `127.0.0.1`. |
| `packages/coding-capabilities` | How the coding capabilities compose on each of the two surfaces (the Loader rows and the packages each must resolve). |
| `distribution/acryl-web-container` | A Debian image that runs one `acryl-web` workspace per container. |
| `scripts/` | Release tooling: the portable archive builders, the release receipts and manifest, the npm runtime packer. |

Everything else ACRYL is made of (the control plane, the harness runtime, the plugins, Blends) is a published `@acryldev/*` package on npm, pinned exactly in the two apps' `package.json`. This repository depends on those packages and on nothing in the [acryldev/acryl](https://github.com/acryldev/acryl) checkout.

`acryl new`, `acryl share` and the other app-making commands are the `acryl` selector's (`npx acryl@latest new <name>`); the terminal agent prints that line when asked.

## Develop

Node `^22.19.0` or `>=24`, and the pnpm release in `packageManager` (Corepack).

```sh
corepack pnpm install
corepack pnpm run check      # build, typecheck and test every package, then the release scripts' tests
corepack pnpm run tui        # build and start the terminal agent from source
corepack pnpm run web        # build and start the browser surface from source
```

## Booting an app to test it: live-run

Never start an app on a real home to test a guard. `node scripts/live-run.mjs web|tui` runs the built surface in a throwaway root with its own `HOME`, ACRYL and engine homes (`ACRYL_REQUIRE_ISOLATED_HOME` makes the runtime refuse a real one), takes the real homes' snapshot first, and on stop checks that the port is free and that nothing in a real home changed. Build first (`node scripts/with-build-lock.mjs corepack pnpm run build`); it never builds. `node scripts/live-run.mjs stop` ends a run from anywhere. This is the tool the monorepo's own rule points at (acryldev/acryl, AGENTS.md).

## Release

A tag `v<version>` (equal to the version in the root and both apps' `package.json`) runs `.github/workflows/release.yml`:

1. builds `acryl-cli` and `acryl-web` as portable archives for darwin-arm64, linux-arm64, linux-x64 and windows-x64, smokes each archive from a clean extraction, and writes a receipt per archive;
2. validates one release manifest covering all eight archives;
3. packs `acryl-cli-<target>` npm tarballs from the CLI archives (the runtimes the `acryl` selector installs into `~/.acryl/runtime` on first use);
4. creates the GitHub release with the archives, the manifest and the tarballs.

Publishing the tarballs to npm is a separate, explicit step: `npm publish ./acryl-cli-<target>-<version>.tgz --access public` for each target, then the `acryl` selector from acryldev/acryl with `acrylRuntime` set to this version.

## License

MIT. The history of the two apps and the container is kept from the `acryldev/acryl` repository they were split from.
