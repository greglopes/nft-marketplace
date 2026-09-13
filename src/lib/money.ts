/**
 * ETH values travel as decimal strings ("1.19"). Arithmetic is done with
 * BigInt in wei (18 decimals) so no precision is ever lost.
 */
export type EthString = string

const DECIMALS = 18n
const ONE_ETH = 10n ** DECIMALS

export function parseEth(value: EthString): bigint {
  const trimmed = value.trim()
  if (!/^-?\d*(\.\d*)?$/.test(trimmed) || trimmed === '' || trimmed === '.') {
    throw new Error(`Invalid ETH value: "${value}"`)
  }
  const negative = trimmed.startsWith('-')
  const [intPart = '0', fracPart = ''] = trimmed.replace('-', '').split('.')
  const frac = (fracPart + '0'.repeat(18)).slice(0, 18)
  const wei = BigInt(intPart || '0') * ONE_ETH + BigInt(frac || '0')
  return negative ? -wei : wei
}

export function weiToEth(wei: bigint, maxDecimals = 18): EthString {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const intPart = abs / ONE_ETH
  let frac = (abs % ONE_ETH).toString().padStart(18, '0')
  frac = frac.slice(0, maxDecimals).replace(/0+$/, '')
  return `${negative ? '-' : ''}${intPart}${frac ? '.' + frac : ''}`
}

export function addEth(...values: EthString[]): EthString {
  return weiToEth(values.reduce((acc, v) => acc + parseEth(v), 0n))
}

export function subEth(a: EthString, b: EthString): EthString {
  return weiToEth(parseEth(a) - parseEth(b))
}

export function mulEthByInt(value: EthString, qty: number): EthString {
  if (!Number.isInteger(qty)) throw new Error('quantity must be an integer')
  return weiToEth(parseEth(value) * BigInt(qty))
}

/** percentage with up to 2 decimals, e.g. 10 => 10% */
export function percentOfEth(value: EthString, pct: number): EthString {
  const bp = BigInt(Math.round(pct * 100)) // basis points
  return weiToEth((parseEth(value) * bp) / 10_000n)
}

export function compareEth(a: EthString, b: EthString): -1 | 0 | 1 {
  const x = parseEth(a)
  const y = parseEth(b)
  return x < y ? -1 : x > y ? 1 : 0
}

export function isSameEth(a: EthString, b: EthString): boolean {
  return parseEth(a) === parseEth(b)
}

/** Presentation: "1.19 ETH" — keeps 2..4 decimals, never rounds silently past precision. */
export function formatEth(value: EthString, opts: { decimals?: number; unit?: boolean } = {}): string {
  const { decimals = 4, unit = true } = opts
  const wei = parseEth(value)
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const intPart = abs / ONE_ETH
  const frac = (abs % ONE_ETH).toString().padStart(18, '0').slice(0, decimals)
  const trimmed = frac.replace(/0+$/, '')
  const minFrac = Math.min(2, decimals)
  const shown = trimmed.length < minFrac ? trimmed.padEnd(minFrac, '0') : trimmed
  const text = `${negative ? '-' : ''}${intPart}${shown ? '.' + shown : ''}`
  return unit ? `${text} ETH` : text
}
