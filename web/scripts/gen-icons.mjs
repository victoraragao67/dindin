#!/usr/bin/env node
/**
 * Gera ícones PNG placeholder para o PWA.
 * Execute: pnpm gen-icons
 *
 * Para produção, substitua os arquivos gerados por ícones reais (192x192, 512x512, 180x180).
 * Ferramenta sugerida: https://www.pwabuilder.com/imageGenerator
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

mkdirSync(publicDir, { recursive: true })

/**
 * Gera um PNG minimal válido de dimensão NxN com cor sólida.
 * Usa adler32 + deflate (sem compressão, nível 0) para o IDAT.
 * Cor: RGB hex string, ex: '22c55e' (verde)
 */
function makePng(size, hexColor) {
  const r = parseInt(hexColor.slice(0, 2), 16)
  const g = parseInt(hexColor.slice(2, 4), 16)
  const b = parseInt(hexColor.slice(4, 6), 16)

  // Constrói dados de imagem raw: 1 byte filtro (0x00) + 3 bytes por pixel
  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(size * rowSize)
  for (let y = 0; y < size; y++) {
    const base = y * rowSize
    raw[base] = 0x00 // filter type: None
    for (let x = 0; x < size; x++) {
      raw[base + 1 + x * 3] = r
      raw[base + 1 + x * 3 + 1] = g
      raw[base + 1 + x * 3 + 2] = b
    }
  }

  // zlib wrapper (deflate nível 0 = sem compressão)
  // RFC 1950: CMF=0x78 FLG=0x01, BTYPE=01 (nível 1, sem compressão), BFINAL=1
  const deflate = deflateNoCompress(raw)
  const adler = adler32(raw)
  const zlib = Buffer.allocUnsafe(deflate.length + 6)
  zlib[0] = 0x78
  zlib[1] = 0x01
  deflate.copy(zlib, 2)
  zlib.writeUInt32BE(adler, 2 + deflate.length)

  function chunk(type, data) {
    const buf = Buffer.allocUnsafe(12 + data.length)
    buf.writeUInt32BE(data.length, 0)
    buf.write(type, 4, 'ascii')
    data.copy(buf, 8)
    buf.writeUInt32BE(crc32(buf.subarray(4, 8 + data.length)), 8 + data.length)
    return buf
  }

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: RGB
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  const parts = [
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib),
    chunk('IEND', Buffer.alloc(0)),
  ]
  return Buffer.concat(parts)
}

function deflateNoCompress(data) {
  // Store blocks de 65535 bytes
  const maxBlock = 65535
  const blocks = []
  let offset = 0
  while (offset < data.length) {
    const end = Math.min(offset + maxBlock, data.length)
    const block = data.subarray(offset, end)
    const last = end >= data.length ? 1 : 0
    const header = Buffer.allocUnsafe(5)
    header[0] = last        // BFINAL | BTYPE=00
    header.writeUInt16LE(block.length, 1)
    header.writeUInt16LE(~block.length & 0xffff, 3)
    blocks.push(header, block)
    offset = end
  }
  return Buffer.concat(blocks)
}

function adler32(buf) {
  let s1 = 1, s2 = 0
  for (let i = 0; i < buf.length; i++) {
    s1 = (s1 + buf[i]) % 65521
    s2 = (s2 + s1) % 65521
  }
  return ((s2 << 16) | s1) >>> 0  // força uint32 sem sinal
}

function crc32(buf) {
  const table = crc32.table || (crc32.table = buildCrcTable())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}
function buildCrcTable() {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
}

const icons = [
  { name: 'icon-192.png',        size: 192, color: '22c55e' },
  { name: 'icon-512.png',        size: 512, color: '22c55e' },
  { name: 'apple-touch-icon.png', size: 180, color: '22c55e' },
]

for (const { name, size, color } of icons) {
  const dest = join(publicDir, name)
  writeFileSync(dest, makePng(size, color))
  console.log(`✓ public/${name} (${size}x${size}, #${color})`)
}

console.log('\nÍcones placeholder criados. Substitua por arte final antes do lançamento.')
console.log('Ferramenta sugerida: https://www.pwabuilder.com/imageGenerator\n')
