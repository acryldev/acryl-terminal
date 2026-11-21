#!/usr/bin/env node
/**
 * Pack the terminal agent's prepared runtimes as npm tarballs, one per target (`acryl-cli-<target>`), from the release archives that
 * `build-cli-archive.mjs` made. Publication is a separate, explicit step (`npm publish ./npm-packages/*.tgz`); the `acryl` selector
 * (acryldev/acryl, distribution/acryl-npm-launcher) installs these into ~/.acryl/runtime the first time someone opens the terminal agent.
 *
 * Usage: node scripts/pack-npm-runtimes.mjs <artifact-dir> <out-dir> [--only <target>]
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execShim, tarCommand } from './lib/portable-commands.mjs'
import { CLI_TARGETS, targetPackageName } from './release-contract.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = JSON.parse(readFileSync(join(root, 'apps', 'acryl-cli', 'package.json'), 'utf8')).version
const [artifactArg, outArg] = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
const onlyIndex = process.argv.indexOf('--only')
const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1]
if (artifactArg === undefined || outArg === undefined) throw new Error('usage: pack-npm-runtimes.mjs <artifact-dir> <out-dir> [--only <target>]')
if (only !== undefined && !CLI_TARGETS[only]) throw new Error(`pack-npm-runtimes: --only needs one of ${Object.keys(CLI_TARGETS).join(', ')}`)
const artifactDir = resolve(artifactArg)
const outDir = resolve(outArg)
const staging = mkdtempSync(join(tmpdir(), 'acryl-npm-runtimes-'))

function manifest(target) {
  const spec = CLI_TARGETS[target]
  return { name: targetPackageName(target), version, private: false, description: `ACRYL prepared CLI runtime for ${target}`, license: 'MIT', os: [spec.npmOs], cpu: [spec.npmCpu], files: ['runtime/**'] }
}

function extract(target, directory) {
  const archive = join(artifactDir, `acryl-cli-${target}.${target === 'windows-x64' ? 'zip' : 'tar.gz'}`)
  if (!existsSync(archive)) throw new Error(`pack-npm-runtimes: missing ${archive}; run build-cli-archive first`)
  mkdirSync(directory, { recursive: true })
  // GNU tar cannot read the Windows .zip; Windows' own tar reads both.
  if (target === 'windows-x64' && process.platform !== 'win32') execFileSync('unzip', ['-q', archive, '-d', directory], { stdio: 'inherit' })
  else execFileSync(tarCommand(), ['-xf', archive, '-C', directory], { stdio: 'inherit' })
  const extracted = join(directory, `acryl-cli-${target}`)
  if (!existsSync(join(extracted, 'receipt.json'))) throw new Error(`pack-npm-runtimes: ${archive} has no runtime receipt`)
  cpSync(extracted, join(directory, 'runtime'), { recursive: true })
  rmSync(extracted, { recursive: true, force: true })
}

try {
  mkdirSync(outDir, { recursive: true })
  for (const target of only === undefined ? Object.keys(CLI_TARGETS) : [only]) {
    const directory = join(staging, targetPackageName(target))
    extract(target, directory)
    writeFileSync(join(directory, 'package.json'), `${JSON.stringify(manifest(target), null, 2)}\n`)
    execShim('npm', ['pack', '--silent'], { cwd: directory, stdio: 'inherit' })
    const tarball = readdirSync(directory).find(name => name.endsWith('.tgz'))
    if (tarball === undefined) throw new Error(`pack-npm-runtimes: npm pack made no tarball for ${target}`)
    cpSync(join(directory, tarball), join(outDir, tarball))
    console.log(`packed ${tarball}`)
  }
} finally {
  rmSync(staging, { recursive: true, force: true })
}
