const CircularDependencyPlugin = require('circular-dependency-plugin')

module.exports = (nextConfig = {}) => {
  return Object.assign({}, nextConfig, {
    webpack (config, options) {
      nextConfig = Object.assign({
        exclude: new RegExp('$^'),
        include: new RegExp('.*'),
        failOnError: !options.dev,
        allowAsyncCycles: false,
        cwd: process.cwd(),
        onStart: undefined,
        onDetected: undefined,
        onEnd: undefined
      }, nextConfig)

      if (!options.defaultLoaders) {
        throw new Error(
          'This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade'
        )
      }

      config.plugins = [
        ...config.plugins,
        new CircularDependencyPlugin({
          exclude: nextConfig.exclude,
          include: nextConfig.include,
          failOnError: nextConfig.failOnError,
          allowAsyncCycles: nextConfig.allowAsyncCycles,
          cwd: nextConfig.cwd,
          onStart: nextConfig.onStart,
          onDetected: nextConfig.onDetected,
          onEnd: nextConfig.onEnd
        })
      ]

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options)
      }

      return config
    }
  })
}
