import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// The `acryl` selector (acryldev/acryl, distribution/acryl-npm-launcher/runtime.js) starts this runtime on Windows without cmd.exe by running what the .cmd launcher
// runs: this Node, with --expose-internals, on lib/bin.js. The .cmd must keep running exactly that, or the two ways of starting the agent drift apart.
test('the Windows launcher runs the line the selector runs directly', () => {
  const cmd = readFileSync(new URL('../apps/acryl-cli/scripts/acryl-cli-launcher.cmd', import.meta.url), 'utf8')
  assert.match(cmd, /^node --expose-internals "%DIR%\.\.\\lib\\bin\.js" %\*\r?$/mu)
})
