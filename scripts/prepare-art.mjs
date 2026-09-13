/**
 * Optimises the NFT portraits exported from the Figma file (assets/figma/*.png,
 * 1254×1254) into WebP variants used by the app: 400px for cards and 900px
 * for hero/detail. Run: npm run prepare:art
 */
import { mkdirSync, readdirSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import sharp from 'sharp'

const SRC = resolve('assets/figma')
const OUT = resolve('public/art')
const SIZES = [400, 900]
mkdirSync(OUT, { recursive: true })

for (const file of readdirSync(SRC).filter((f) => extname(f) === '.png')) {
  const name = basename(file, '.png')
  for (const size of SIZES) {
    const out = resolve(OUT, `${name}-${size}.webp`)
    await sharp(resolve(SRC, file)).resize(size, size, { fit: 'cover' }).webp({ quality: size === 400 ? 78 : 82 }).toFile(out)
    console.log(`${name}-${size}.webp`)
  }
}
