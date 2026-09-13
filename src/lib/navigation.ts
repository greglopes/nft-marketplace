import type { NavigateOptions } from '@tanstack/react-router'

/**
 * Turns a same-origin href (e.g. the `redirect` search param) into router
 * navigation options. Anything that is not a local path falls back to "/".
 */
export function hrefToNavigate(href: string | undefined, replace = true): NavigateOptions {
  const safe = href && href.startsWith('/') && !href.startsWith('//') ? href : '/'
  const url = new URL(safe, window.location.origin)
  const search = Object.fromEntries(url.searchParams.entries())
  return {
    to: url.pathname,
    search: search as never,
    hash: url.hash ? url.hash.slice(1) : undefined,
    replace,
  } as NavigateOptions
}
