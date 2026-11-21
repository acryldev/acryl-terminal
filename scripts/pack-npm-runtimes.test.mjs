import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { execShim, tarCommand } from './lib/portable-commands.mjs'
import { payloadSha256, receiptFor } from './release-contract.mjs'

test('packs a runtime archive into the npm package the selector installs', () => {
  const work = mkdtempSync(join(tmpdir(), 'acryl-pack-test-'))
  try {
    const runtime = join(work, 'stage', 'acryl-cli-linux-x64')
    mkdirSync(join(runtime, 'bin'), { recursive: true })
    writeFileSync(join(runtime, 'bin', 'acryl'), '#!/bin/sh\n')
    writeFileSync(join(runtime, 'receipt.json'), `${JSON.stringify(receiptFor({ target: 'linux-x64', version: '0.3.0', payloadSha256: payloadSha256(runtime) }))}\n`)
    mkdirSync(join(work, 'artifacts'))
    execFileSync(tarCommand(), ['-czf', join(work, 'artifacts', 'acryl-cli-linux-x64.tar.gz'), '-C', join(work, 'stage'), 'acryl-cli-linux-x64'])
    execShim(process.execPath, ['scripts/pack-npm-runtimes.mjs', join(work, 'artifacts'), join(work, 'out'), '--only', 'linux-x64'], { stdio: 'pipe' })
    const packed = readdirSync(join(work, 'out'))
    assert.equal(packed.length, 1)
    assert.match(packed[0], /^acryl-cli-linux-x64-\d+\.\d+\.\d+\.tgz$/u)
  } finally { rmSync(work, { recursive: true, force: true }) }
})
