/** Shared Lighthouse configuration (versioned). Presets: mobile (default) and desktop. */
export const baseConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    // The demo build serves data through a Service Worker (MSW); keep it registered.
    disableStorageReset: true,
    skipAudits: ['uses-http2'],
  },
}

export const desktopConfig = {
  ...baseConfig,
  settings: {
    ...baseConfig.settings,
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10 * 1024, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
    emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Chrome-Lighthouse',
  },
}

export const mobileConfig = {
  ...baseConfig,
  settings: { ...baseConfig.settings, formFactor: 'mobile' },
}
