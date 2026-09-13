/** Portrait URLs come as the 900px variant; cards use the 400px one via srcSet. */
export function artSrcSet(url: string) {
  const small = url.replace('-900.webp', '-400.webp')
  return { src: small, srcSet: `${small} 400w, ${url} 900w` }
}
