const assert = require('assert')
const path = require('path')
const withCircularDependency = require('./')
const CircularDependencyPlugin = require('circular-dependency-plugin')

let passed = 0
let failed = 0

function test (name, run) {
  try {
    run()
    passed++
    console.log('ok - ' + name)
  } catch (error) {
    failed++
    console.error('not ok - ' + name)
    console.error(error.stack)
  }
}

function buildOptions (overrides) {
  return Object.assign({ dev: true, isServer: false, defaultLoaders: {} }, overrides)
}

function pluginFor (wrapped, overrides) {
  const config = wrapped.webpack({ plugins: [] }, buildOptions(overrides))
  assert.strictEqual(config.plugins.length, 1)
  assert(config.plugins[0] instanceof CircularDependencyPlugin)
  return config.plugins[0]
}

// Exercise the real dependency's compilation hooks with a two-module graph.
function compileCycle (plugin, webpackVersion, weak) {
  let onCompilation
  let onOptimizeModules
  const compiler = {
    hooks: {
      compilation: {
        tap (name, handler) {
          onCompilation = handler
        }
      }
    }
  }
  const first = { debugId: 1, resource: path.resolve('a.js'), dependencies: [] }
  const second = { debugId: 2, resource: path.resolve('b.js'), dependencies: [] }
  const toSecond = { module: second, weak: !!weak }
  const toFirst = { module: first, weak: false }
  first.dependencies.push(toSecond)
  second.dependencies.push(toFirst)
  const compilation = {
    errors: [],
    warnings: [],
    hooks: {
      optimizeModules: {
        tap (name, handler) {
          onOptimizeModules = handler
        }
      }
    }
  }
  if (webpackVersion === 5) {
    const modules = new Map([[toSecond, second], [toFirst, first]])
    delete toSecond.module
    delete toFirst.module
    compilation.moduleGraph = { getModule: dependency => modules.get(dependency) }
  }
  plugin.apply(compiler)
  onCompilation(compilation)
  onOptimizeModules([first, second])
  return compilation
}

const factories = {
  legacy: (options, nextConfig) => withCircularDependency(Object.assign({}, nextConfig, options)),
  separate: (options, nextConfig) => withCircularDependency.withOptions(options)(nextConfig)
}

Object.keys(factories).forEach(api => {
  const wrap = factories[api]

  test(api + ': omitted options and config use defaults', () => {
    const wrapped = api === 'legacy' ? withCircularDependency() : withCircularDependency.withOptions()()
    const options = pluginFor(wrapped).options
    assert.strictEqual(options.exclude.test('a.js'), false)
    assert.strictEqual(options.include.test('a.js'), true)
    assert.strictEqual(options.failOnError, false)
    assert.strictEqual(options.allowAsyncCycles, false)
    assert.strictEqual(options.cwd, process.cwd())
  })

  ;[true, false].forEach(dev => {
    ;[true, false].forEach(isServer => {
      test(api + ': defaults for dev=' + dev + ', isServer=' + isServer, () => {
        assert.strictEqual(pluginFor(wrap(), { dev, isServer }).options.failOnError, !dev)
      })
    })
  })

  test(api + ': forwards every supported option unchanged', () => {
    const options = {
      exclude: /excluded/,
      include: /included/,
      failOnError: false,
      allowAsyncCycles: true,
      cwd: '/app',
      onStart () {},
      onDetected () {},
      onEnd () {}
    }
    const original = Object.assign({}, options)
    const plugin = pluginFor(wrap(Object.freeze(options)), { dev: false })
    Object.keys(options).forEach(key => assert.strictEqual(plugin.options[key], options[key]))
    assert.deepStrictEqual(options, original)
  })

  test(api + ': chains the webpack hook after appending the plugin', () => {
    const existingPlugin = {}
    const plugins = [existingPlugin]
    const config = { plugins }
    const options = buildOptions({ isServer: true, nextRuntime: 'edge', buildId: 'test', custom: {} })
    const result = {}
    let called = 0
    const nextConfig = {
      reactStrictMode: true,
      webpack (receivedConfig, receivedOptions) {
        called++
        assert.strictEqual(this.reactStrictMode, true)
        assert.strictEqual(receivedConfig, config)
        assert.strictEqual(receivedOptions, options)
        assert.strictEqual(receivedConfig.plugins[0], existingPlugin)
        assert(receivedConfig.plugins[1] instanceof CircularDependencyPlugin)
        return result
      }
    }
    const wrapped = wrap({}, Object.freeze(nextConfig))
    assert.notStrictEqual(wrapped, nextConfig)
    assert.strictEqual(wrapped.reactStrictMode, true)
    assert.strictEqual(wrapped.webpack(config, options), result)
    assert.strictEqual(called, 1)
    assert.deepStrictEqual(plugins, [existingPlugin])
  })

  test(api + ': keeps explicit false in production and true in development', () => {
    assert.strictEqual(pluginFor(wrap({ failOnError: false }), { dev: false }).options.failOnError, false)
    assert.strictEqual(pluginFor(wrap({ failOnError: true }), { dev: true }).options.failOnError, true)
  })

  test(api + ': retains the compatibility guard before config mutation or hook calls', () => {
    const plugins = []
    const config = { plugins }
    const wrapped = wrap({}, { webpack () { throw new Error('must not run') } })
    assert.throws(() => wrapped.webpack(config, { dev: true }), /not compatible with Next.js versions below 5/)
    assert.strictEqual(config.plugins, plugins)
    assert.strictEqual(plugins.length, 0)
  })

  test(api + ': propagates errors from an existing webpack hook', () => {
    const error = new Error('custom webpack failure')
    const wrapped = wrap({}, { webpack () { throw error } })
    assert.throws(() => wrapped.webpack({ plugins: [] }, buildOptions()), thrown => thrown === error)
  })

  ;[4, 5].forEach(webpackVersion => {
    test(api + ': real plugin reports warnings and errors with webpack ' + webpackVersion + ' hooks', () => {
      const warning = compileCycle(pluginFor(wrap()), webpackVersion)
      assert.strictEqual(warning.warnings.length, 2)
      assert.strictEqual(warning.errors.length, 0)
      assert(/a\.js -> b\.js -> a\.js/.test(warning.warnings[0].message))
      const error = compileCycle(pluginFor(wrap({ failOnError: true })), webpackVersion)
      assert.strictEqual(error.errors.length, 2)
      assert.strictEqual(error.warnings.length, 0)
    })
  })

  test(api + ': real plugin respects include, exclude and async-cycle options', () => {
    assert.strictEqual(compileCycle(pluginFor(wrap({ exclude: /\.js$/ })), 5).warnings.length, 0)
    assert.strictEqual(compileCycle(pluginFor(wrap({ include: /unmatched/ })), 5).warnings.length, 0)
    assert.strictEqual(compileCycle(pluginFor(wrap({ allowAsyncCycles: true })), 5, true).warnings.length, 0)
    assert.strictEqual(compileCycle(pluginFor(wrap({ allowAsyncCycles: false })), 5, true).warnings.length, 2)
  })

  test(api + ': real plugin invokes callbacks with the compilation and relative paths', () => {
    const events = []
    const wrapped = wrap({
      cwd: process.cwd(),
      onStart ({ compilation }) { events.push(['start', compilation]) },
      onDetected ({ paths, compilation }) { events.push(['detected', compilation, paths]) },
      onEnd ({ compilation }) { events.push(['end', compilation]) }
    })
    const compilation = compileCycle(pluginFor(wrapped), 5)
    assert.deepStrictEqual(events.map(event => event[0]), ['start', 'detected', 'detected', 'end'])
    events.forEach(event => assert.strictEqual(event[1], compilation))
    assert.deepStrictEqual(events[1][2], ['a.js', 'b.js', 'a.js'])
    assert.strictEqual(compilation.warnings.length, 0)
    assert.strictEqual(compilation.errors.length, 0)
  })
})

test('separate: plugin options never become Next config properties', () => {
  const pluginOptions = Object.freeze({ include: /src/, failOnError: true, allowAsyncCycles: true })
  const nextConfig = Object.freeze({ reactStrictMode: true, env: { EXAMPLE: 'value' } })
  const wrapped = withCircularDependency.withOptions(pluginOptions)(nextConfig)
  assert.deepStrictEqual(Object.keys(wrapped).sort(), ['env', 'reactStrictMode', 'webpack'])
  assert.strictEqual(wrapped.env, nextConfig.env)
  pluginFor(wrapped)
  assert.deepStrictEqual(Object.keys(wrapped).sort(), ['env', 'reactStrictMode', 'webpack'])
})

test('separate: Next config properties do not configure the plugin', () => {
  const wrapped = withCircularDependency.withOptions()({ failOnError: true, include: /next/ })
  assert.strictEqual(wrapped.failOnError, true)
  assert.strictEqual(pluginFor(wrapped).options.failOnError, false)
  assert.strictEqual(pluginFor(wrapped).options.include.test('a.js'), true)
})

test('separate: options cannot replace Next settings or the existing webpack hook', () => {
  const expected = {}
  const wrapped = withCircularDependency.withOptions({
    reactStrictMode: false,
    webpack () { throw new Error('not a plugin option') }
  })({ reactStrictMode: true, webpack: () => expected })
  assert.strictEqual(wrapped.reactStrictMode, true)
  assert.strictEqual(wrapped.webpack({ plugins: [] }, buildOptions()), expected)
})

test('separate: reusable factories keep Next configs and build defaults independent', () => {
  const withOptions = withCircularDependency.withOptions()
  const first = withOptions({ env: { NAME: 'first' } })
  const second = withOptions({ env: { NAME: 'second' } })
  assert.strictEqual(first.env.NAME, 'first')
  assert.strictEqual(second.env.NAME, 'second')
  assert.strictEqual(pluginFor(first, { dev: true }).options.failOnError, false)
  assert.strictEqual(pluginFor(first, { dev: false }).options.failOnError, true)
  assert.strictEqual(pluginFor(second, { dev: false }).options.failOnError, true)
  assert.strictEqual(pluginFor(second, { dev: true }).options.failOnError, false)
})

test('legacy: existing options remain on the returned config', () => {
  const include = /legacy/
  const wrapped = withCircularDependency({ include, failOnError: true, reactStrictMode: true })
  assert.strictEqual(wrapped.include, include)
  assert.strictEqual(wrapped.failOnError, true)
  assert.strictEqual(wrapped.reactStrictMode, true)
})

test('legacy: preserves the merged hook receiver without mutating caller input', () => {
  let receiver
  const nextConfig = Object.freeze({
    reactStrictMode: true,
    webpack (config) {
      receiver = this
      this.calls = (this.calls || 0) + 1
      return config
    }
  })
  const wrapped = withCircularDependency(nextConfig)
  pluginFor(wrapped, { dev: true })
  assert.notStrictEqual(receiver, nextConfig)
  assert.strictEqual(receiver.failOnError, false)
  assert.strictEqual(receiver.calls, 1)
  assert.strictEqual(receiver.reactStrictMode, true)
  pluginFor(wrapped, { dev: false })
  assert.strictEqual(receiver.calls, 2)
  assert.strictEqual(nextConfig.calls, undefined)
  assert.strictEqual(nextConfig.failOnError, undefined)
})

test('legacy: retains first-invocation defaults for backward compatibility', () => {
  const developmentFirst = withCircularDependency()
  assert.strictEqual(pluginFor(developmentFirst, { dev: true }).options.failOnError, false)
  assert.strictEqual(pluginFor(developmentFirst, { dev: false }).options.failOnError, false)
  const productionFirst = withCircularDependency()
  assert.strictEqual(pluginFor(productionFirst, { dev: false }).options.failOnError, true)
  assert.strictEqual(pluginFor(productionFirst, { dev: true }).options.failOnError, true)
})

console.log(passed + ' passed, ' + failed + ' failed')
if (failed) process.exitCode = 1
