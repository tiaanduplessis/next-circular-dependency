const CircularDependencyPlugin = require('circular-dependency-plugin')

const createWrapper = (pluginOptions, legacy = false) => (nextConfig = {}) => {
  return Object.assign({}, nextConfig, {
    webpack (config, options) {
      const circularOptions = Object.assign({
        exclude: /$^/,
        include: /.*/,
        failOnError: !options.dev,
        allowAsyncCycles: false,
        cwd: process.cwd(),
        onStart: undefined,
        onDetected: undefined,
        onEnd: undefined
      }, pluginOptions)

      if (legacy) {
        // Preserve the original hook receiver and its state between builds.
        nextConfig = circularOptions
        pluginOptions = circularOptions
      }

      if (!options.defaultLoaders) {
        throw new Error(
          'This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade'
        )
      }

      config.plugins = [
        ...config.plugins,
        new CircularDependencyPlugin({
          exclude: circularOptions.exclude,
          include: circularOptions.include,
          failOnError: circularOptions.failOnError,
          allowAsyncCycles: circularOptions.allowAsyncCycles,
          cwd: circularOptions.cwd,
          onStart: circularOptions.onStart,
          onDetected: circularOptions.onDetected,
          onEnd: circularOptions.onEnd
        })
      ]

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options)
      }

      return config
    }
  })
}

// Keep the original one-call API for existing next.config.js files.
module.exports = (nextConfig = {}) => createWrapper(nextConfig, true)(nextConfig)
module.exports.withOptions = (pluginOptions = {}) => createWrapper(pluginOptions)
