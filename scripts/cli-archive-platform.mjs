/** Return the executable name used to spawn Corepack on the build host. */
export function corepackCommand(platform) {
  return platform === 'win32' ? 'corepack.cmd' : 'corepack'
}

/** Return the spawn options needed for the platform's Corepack entrypoint. */
export function corepackSpawnOptions(platform) {
  return platform === 'win32' ? { shell: true } : {}
}

/**
 * The pnpm release that builds a release archive's dependency closure with `pnpm deploy --legacy`: the one this repository pins (packageManager).
 * The monorepo this was moved from had to use 11.8.0 here, because 11.11's legacy deploy installed nothing.
 */
export const DEPLOY_PNPM = 'pnpm@12.14.0'

/** Arguments for `corepack` that run `pnpm deploy` for one workspace package under {@link DEPLOY_PNPM}. */
export function deployArguments(packageName, targetDirectory) {
  return [DEPLOY_PNPM, '--filter', packageName, 'deploy', targetDirectory, '--prod', '--legacy']
}

/** The environment for that step: Corepack must accept a release other than the one `packageManager` pins. */
export function deployEnvironment(environment, extra = {}) {
  return { ...environment, CI: 'true', COREPACK_ENABLE_STRICT: '0', ...extra }
}
