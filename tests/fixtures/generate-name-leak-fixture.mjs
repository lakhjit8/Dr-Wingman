#!/usr/bin/env node
// Generates tests/fixtures/name-leak-test.png: a synthetic dating-profile-
// style screenshot with a test name ("SARAH") appearing both as a name
// label and inside body/bio text, so tests/name-leakage.test.ts can assert
// the name never survives analysis. Pure JS (zlib only) so this fixture is
// reproducible in any CI environment without native canvas dependencies —
// run once, the output PNG is committed; re-run only if the fixture needs
// to change.

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 5x7 block-letter bitmaps, '#' = ink. Only the glyphs this fixture's text needs.
const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '..#..', '..#..', '.#...'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
}

const SCALE = 6
const GLYPH_W = 5
const GLYPH_H = 7
const GLYPH_GAP = 2
const LINE_GAP = 16
const MARGIN = 24

function renderLine(text) {
  const chars = text.toUpperCase().split('')
  const width = chars.length * (GLYPH_W * SCALE + GLYPH_GAP * SCALE) - GLYPH_GAP * SCALE
  const height = GLYPH_H * SCALE
  const grid = Array.from({ length: height }, () => new Uint8Array(width).fill(255))

  let x = 0
  for (const ch of chars) {
    const glyph = FONT[ch] ?? FONT[' ']
    for (let gy = 0; gy < GLYPH_H; gy++) {
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (glyph[gy][gx] !== '#') continue
        for (let sy = 0; sy < SCALE; sy++) {
          for (let sx = 0; sx < SCALE; sx++) {
            grid[gy * SCALE + sy][x + gx * SCALE + sx] = 0
          }
        }
      }
    }
    x += (GLYPH_W + GLYPH_GAP) * SCALE
  }
  return { grid, width, height }
}

function composeLines(lines) {
  const rendered = lines.map(renderLine)
  const width = Math.max(...rendered.map((r) => r.width)) + MARGIN * 2
  const height = rendered.reduce((sum, r) => sum + r.height, 0) + LINE_GAP * (lines.length - 1) + MARGIN * 2
  const canvas = Array.from({ length: height }, () => new Uint8Array(width).fill(255))

  let y = MARGIN
  for (const r of rendered) {
    for (let ry = 0; ry < r.height; ry++) {
      canvas[y + ry].set(r.grid[ry], MARGIN)
    }
    y += r.height + LINE_GAP
  }
  return { canvas, width, height }
}

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function encodePng(canvas, width, height) {
  const raw = Buffer.alloc((width + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0 // filter type: none
    for (let x = 0; x < width; x++) {
      raw[y * (width + 1) + 1 + x] = canvas[y][x]
    }
  }
  const compressed = deflateSync(raw)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 0 // color type: grayscale
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const { canvas, width, height } = composeLines(['SARAH, 28', 'SARAH LOVES HIKING', 'AND COFFEE'])
const png = encodePng(canvas, width, height)
writeFileSync(join(__dirname, 'name-leak-test.png'), png)
console.log(`Wrote name-leak-test.png (${width}x${height})`)
