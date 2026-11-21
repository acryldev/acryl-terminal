import { describe, expect, it } from 'vitest'
import { runAcryl } from '../src/cli/run.ts'

describe('acryl new', () => {
  it('points at the selector that makes apps, and writes nothing', async () => {
    const lines: string[] = []
    let code = 0
    await runAcryl(['new', 'books'], { write: line => lines.push(line), exit: value => { code = value } })
    expect(code).toBe(0)
    expect(lines.join('\n')).toContain('npx acryl@latest new')
    expect(lines.join('\n')).toContain('npx acryl@latest share')
  })
})
