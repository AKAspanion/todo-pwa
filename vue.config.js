module.exports = {
  pwa: {
    workboxOptions: {
      // Activate a new release as soon as it is installed instead of waiting for
      // every open tab (or the installed Android app) to close.
      skipWaiting: true,
      clientsClaim: true,
    },
  },
}
