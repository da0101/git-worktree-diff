import { describe, it, expect } from 'vitest'
import { parseDiff, looksLikeDiff } from '@/utils/parseDiff'
import type { DiffLine } from '@/utils/parseDiff'

describe('parseDiff', () => {
  it('parses a basic unified diff with file header, hunk, additions, deletions, and context', () => {
    const raw = [
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,5 +1,5 @@',
      ' import React from "react"',
      '-const old = true',
      '+const updated = true',
      ' ',
      ' export default App',
    ].join('\n')

    const result = parseDiff(raw)
    expect(result).not.toBeNull()
    expect(result!.file).toBe('src/app.ts')
    expect(result!.additions).toBe(1)
    expect(result!.deletions).toBe(1)

    const types = result!.lines.map((l: DiffLine) => l.type)
    expect(types).toEqual(['file', 'file', 'hunk', 'ctx', 'del', 'add', 'ctx', 'ctx'])
  })

  it('tracks oldLineNum and newLineNum correctly', () => {
    const raw = [
      '--- a/file.ts',
      '+++ b/file.ts',
      '@@ -10,4 +20,5 @@',
      ' context',
      '-removed',
      '+added1',
      '+added2',
      ' trailing',
    ].join('\n')

    const result = parseDiff(raw)!
    const lines = result.lines.filter(
      (l) => l.type === 'ctx' || l.type === 'add' || l.type === 'del',
    )

    // First context: old=10, new=20
    expect(lines[0]).toMatchObject({ type: 'ctx', oldLineNum: 10, newLineNum: 20 })
    // Deletion: old=11
    expect(lines[1]).toMatchObject({ type: 'del', oldLineNum: 11 })
    expect(lines[1].newLineNum).toBeUndefined()
    // Addition 1: new=21
    expect(lines[2]).toMatchObject({ type: 'add', newLineNum: 21 })
    expect(lines[2].oldLineNum).toBeUndefined()
    // Addition 2: new=22
    expect(lines[3]).toMatchObject({ type: 'add', newLineNum: 22 })
    // Trailing context: old=12, new=23
    expect(lines[4]).toMatchObject({ type: 'ctx', oldLineNum: 12, newLineNum: 23 })
  })

  it('extracts file name stripping "a/" and "b/" prefixes from +++ line', () => {
    const raw = [
      '--- a/packages/ui/Button.tsx',
      '+++ b/packages/ui/Button.tsx',
      '@@ -1,2 +1,2 @@',
      '-old line',
      '+new line',
    ].join('\n')

    const result = parseDiff(raw)!
    expect(result.file).toBe('packages/ui/Button.tsx')
  })

  it('handles file name without a/ b/ prefix', () => {
    const raw = [
      '--- /dev/null',
      '+++ some/file.ts',
      '@@ -0,0 +1,2 @@',
      '+line1',
      '+line2',
    ].join('\n')

    const result = parseDiff(raw)!
    expect(result.file).toBe('some/file.ts')
  })

  it('handles multiple hunks with line numbers resetting per hunk', () => {
    const raw = [
      '--- a/multi.ts',
      '+++ b/multi.ts',
      '@@ -1,3 +1,3 @@',
      ' first',
      '-old1',
      '+new1',
      ' last',
      '@@ -50,3 +50,4 @@',
      ' ctx50',
      '-del50',
      '+add50a',
      '+add50b',
      ' ctx52',
    ].join('\n')

    const result = parseDiff(raw)!
    expect(result.additions).toBe(3)
    expect(result.deletions).toBe(2)

    // After first hunk, line numbers start at 1
    const hunk1Lines = result.lines.filter(
      (l) => (l.type === 'ctx' || l.type === 'add' || l.type === 'del') && (l.oldLineNum ?? 0) < 50 && (l.newLineNum ?? 0) < 50,
    )
    expect(hunk1Lines[0]).toMatchObject({ type: 'ctx', oldLineNum: 1, newLineNum: 1 })

    // After second hunk, line numbers start at 50
    const secondHunkIdx = result.lines.findIndex(
      (l) => l.type === 'hunk' && l.content.includes('-50'),
    )
    const afterSecondHunk = result.lines.slice(secondHunkIdx + 1)
    const ctxLine = afterSecondHunk.find((l) => l.type === 'ctx')
    expect(ctxLine).toMatchObject({ oldLineNum: 50, newLineNum: 50 })
  })

  it('handles only additions (new file) and returns correct count', () => {
    const raw = [
      '--- /dev/null',
      '+++ b/newfile.ts',
      '@@ -0,0 +1,3 @@',
      '+line one',
      '+line two',
      '+line three',
    ].join('\n')

    const result = parseDiff(raw)!
    expect(result.additions).toBe(3)
    expect(result.deletions).toBe(0)
    expect(result.file).toBe('newfile.ts')
  })

  it('handles only deletions and returns correct count', () => {
    const raw = [
      '--- a/removed.ts',
      '+++ /dev/null',
      '@@ -1,3 +0,0 @@',
      '-line one',
      '-line two',
      '-line three',
    ].join('\n')

    const result = parseDiff(raw)!
    expect(result.deletions).toBe(3)
    expect(result.additions).toBe(0)
  })

  it('returns null when additions and deletions are both zero', () => {
    const raw = [
      '--- a/file.ts',
      '+++ b/file.ts',
      '@@ -1,2 +1,2 @@',
      ' context only line 1',
      ' context only line 2',
    ].join('\n')

    expect(parseDiff(raw)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseDiff('')).toBeNull()
  })

  it('returns null when only headers are present (no diff content)', () => {
    const raw = [
      'diff --git a/file.ts b/file.ts',
      'index abc1234..def5678 100644',
      '--- a/file.ts',
      '+++ b/file.ts',
    ].join('\n')

    expect(parseDiff(raw)).toBeNull()
  })

  it('returns null for a binary diff with no +/- lines', () => {
    const raw = [
      'diff --git a/image.png b/image.png',
      'Binary files a/image.png and b/image.png differ',
    ].join('\n')

    expect(parseDiff(raw)).toBeNull()
  })

  it('parses a large diff with many lines correctly', () => {
    const lines: string[] = [
      '--- a/big.ts',
      '+++ b/big.ts',
      '@@ -1,500 +1,600 @@',
    ]
    for (let i = 0; i < 200; i++) {
      lines.push(` context line ${i}`)
    }
    for (let i = 0; i < 150; i++) {
      lines.push(`-deleted line ${i}`)
    }
    for (let i = 0; i < 250; i++) {
      lines.push(`+added line ${i}`)
    }

    const result = parseDiff(lines.join('\n'))!
    expect(result.additions).toBe(250)
    expect(result.deletions).toBe(150)
    expect(result.file).toBe('big.ts')
    // 2 file headers + 1 hunk header + 200 ctx + 150 del + 250 add = 603
    expect(result.lines).toHaveLength(603)
  })

  it('strips leading space from context lines and tracks their line numbers', () => {
    const raw = [
      '--- a/ctx.ts',
      '+++ b/ctx.ts',
      '@@ -5,4 +5,4 @@',
      ' first context',
      '-removed',
      '+added',
      ' second context',
    ].join('\n')

    const result = parseDiff(raw)!
    const ctxLines = result.lines.filter((l) => l.type === 'ctx')
    // First context at old=5, new=5
    expect(ctxLines[0]).toMatchObject({
      content: 'first context',
      oldLineNum: 5,
      newLineNum: 5,
    })
    // Second context at old=7, new=7
    expect(ctxLines[1]).toMatchObject({
      content: 'second context',
      oldLineNum: 7,
      newLineNum: 7,
    })
  })

  it('returns file as "unknown" when no +++ header is present', () => {
    const raw = [
      '@@ -1,2 +1,2 @@',
      '-old',
      '+new',
    ].join('\n')

    const result = parseDiff(raw)!
    expect(result.file).toBe('unknown')
  })
})

describe('looksLikeDiff', () => {
  it('returns true for a valid diff with both + and - lines', () => {
    const text = [
      '--- a/file.ts',
      '+++ b/file.ts',
      '@@ -1,3 +1,3 @@',
      ' context',
      '-old line',
      '+new line',
    ].join('\n')

    expect(looksLikeDiff(text)).toBe(true)
  })

  it('returns false when only additions are present (no deletions)', () => {
    const text = [
      '+++ b/file.ts',
      '@@ -0,0 +1,2 @@',
      '+line one',
      '+line two',
    ].join('\n')

    expect(looksLikeDiff(text)).toBe(false)
  })

  it('returns false when only deletions are present (no additions)', () => {
    const text = [
      '--- a/file.ts',
      '@@ -1,2 +0,0 @@',
      '-line one',
      '-line two',
    ].join('\n')

    expect(looksLikeDiff(text)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(looksLikeDiff('')).toBe(false)
  })

  it('returns false for regular text without diff markers', () => {
    const text = 'This is just regular text\nwith multiple lines\nbut no diff markers.'
    expect(looksLikeDiff(text)).toBe(false)
  })

  it('returns false when only diff headers (+++ / ---) are present', () => {
    const text = [
      '--- a/file.ts',
      '+++ b/file.ts',
      '@@ -1,2 +1,2 @@',
      ' only context here',
    ].join('\n')

    expect(looksLikeDiff(text)).toBe(false)
  })

  it('returns true for minimal diff with one + and one - line', () => {
    const text = ['-removed', '+added'].join('\n')
    expect(looksLikeDiff(text)).toBe(true)
  })

  it('returns true as soon as both markers are found (short-circuits)', () => {
    const text = [
      '-first deletion',
      'some context',
      '+first addition',
      '-this should not matter',
    ].join('\n')

    expect(looksLikeDiff(text)).toBe(true)
  })
})
