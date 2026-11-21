// Real-execution test (spec 038-ui-component-library, T038): runs `acryl ui` against a registry on disk shaped like the one acryl-ui-registry publishes
// (index.json, <id>/item.yaml, <id>/web/<file>), built here with real digests, so a drift between the digest rules and this command shows up.
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runUiCommand } from '../src/host/ui-command.ts'

const registryDir = mkdtempSync(join(tmpdir(), 'acryl-ui-registry-'))
const digest = (text: string): string => `sha256:${createHash('sha256').update(text).digest('hex')}`

beforeAll(() => {
  const items = [['card', 'Card.tsx'], ['dialog', 'Dialog.tsx']].map(([name, file]) => {
    const id = `acryl.ui.${name}`
    const source = `export const ${file.replace('.tsx', '')} = () => null\n`
    mkdirSync(join(registryDir, id, 'web'), { recursive: true })
    writeFileSync(join(registryDir, id, 'web', file), source)
    writeFileSync(join(registryDir, id, 'item.yaml'), `id: ${id}\n`)
    return { id, kind: 'component', version: '0.1.0', surfaces: ['web'], path: `${id}/item.yaml`, digest: digest(`id: ${id}\n`), files: [{ path: `web/${file}`, digest: digest(source) }] }
  })
  writeFileSync(join(registryDir, 'index.json'), JSON.stringify({ formatVersion: 1, items }))
})

describe('runUiCommand against the real generated registry', () => {
  it('list returns real items with real digests', () => {
    const result = runUiCommand({ action: 'list', registryDir })
    expect(result.kind).toBe('list')
    if (result.kind !== 'list') throw new Error('unreachable')
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.some(item => item.id === 'acryl.ui.card')).toBe(true)
  })

  it('add copies real source, diff detects a real edit, re-add restores it', () => {
    const target = mkdtempSync(join(tmpdir(), 'acryl-ui-cli-add-'))
    try {
      const added = runUiCommand({ action: 'add', registryDir, id: 'acryl.ui.card', targetDir: target })
      expect(added.kind).toBe('add')
      if (added.kind !== 'add') throw new Error('unreachable')
      expect(added.surface).toBe('web')
      const cardFile = join(added.destDir, 'Card.tsx')
      expect(existsSync(cardFile)).toBe(true)

      const clean = runUiCommand({ action: 'diff', registryDir, id: 'acryl.ui.card', targetDir: target })
      expect(clean).toEqual({ kind: 'diff', id: 'acryl.ui.card', status: 'unchanged', changedFiles: [] })

      appendFileSync(cardFile, '\n// edited\n')
      const dirty = runUiCommand({ action: 'diff', registryDir, id: 'acryl.ui.card', targetDir: target })
      expect(dirty.kind).toBe('diff')
      if (dirty.kind !== 'diff') throw new Error('unreachable')
      expect(dirty.status).toBe('changed')
      expect(dirty.changedFiles.some(path => path.includes('Card.tsx'))).toBe(true)

      runUiCommand({ action: 'add', registryDir, id: 'acryl.ui.card', targetDir: target })
      expect(runUiCommand({ action: 'diff', registryDir, id: 'acryl.ui.card', targetDir: target }).kind).toBe('diff')
    } finally {
      rmSync(target, { recursive: true, force: true })
    }
  })

  it('rejects an unknown id and a surface the item does not have', () => {
    const target = mkdtempSync(join(tmpdir(), 'acryl-ui-cli-add-'))
    try {
      expect(() => runUiCommand({ action: 'add', registryDir, id: 'acryl.ui.nonexistent', targetDir: target })).toThrow('unknown registry item')
      expect(() => runUiCommand({ action: 'add', registryDir, id: 'acryl.ui.card', targetDir: target, surface: 'tui' })).toThrow("has no 'tui' surface")
    } finally {
      rmSync(target, { recursive: true, force: true })
    }
  })

  it('diff on a never-installed item reports not-installed rather than throwing', () => {
    const target = mkdtempSync(join(tmpdir(), 'acryl-ui-cli-add-'))
    try {
      expect(runUiCommand({ action: 'diff', registryDir, id: 'acryl.ui.dialog', targetDir: target }))
        .toEqual({ kind: 'diff', id: 'acryl.ui.dialog', status: 'not-installed', changedFiles: [] })
    } finally {
      rmSync(target, { recursive: true, force: true })
    }
  })
})

afterAll(() => {
  rmSync(registryDir, { recursive: true, force: true })
})
