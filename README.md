
# next-circular-dependency
[![package version](https://img.shields.io/npm/v/next-circular-dependency.svg?style=flat-square)](https://npmjs.org/package/next-circular-dependency)
[![package downloads](https://img.shields.io/npm/dm/next-circular-dependency.svg?style=flat-square)](https://npmjs.org/package/next-circular-dependency)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/next-circular-dependency.svg?style=flat-square)](https://npmjs.org/package/next-circular-dependency)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> Detect circular dependencies in your Next.js app

## Table of Contents

- [Usage](#usage)
- [Install](#install)
- [Contribute](#contribute)
- [License](#License)

## Usage

Use the `withOptions` factory to keep circular-dependency options separate from
Next.js configuration:

```js
const { withOptions } = require('next-circular-dependency')

const withCircularDependency = withOptions({
  // exclude detection of files based on a RegExp
  exclude: /node_modules/,
  // include specific files based on a RegExp
  include: /src/,
  // add errors to webpack instead of warnings
  failOnError: true,
  // allow cycles that include an asynchronous, weak import
  allowAsyncCycles: false,
  // base directory for displaying module paths
  cwd: process.cwd()
})

module.exports = withCircularDependency({
  reactStrictMode: true,
  webpack (config, options) {
    // Your existing hook still runs, with the circular-dependency plugin added.
    return config
  }
})
```

Both arguments are optional: `withOptions()()` wraps an empty Next.js config.
The returned wrapper can also be composed with other Next.js config wrappers.
Only the `webpack` property is replaced; other Next.js settings are preserved.
Plugin options are not added to the returned Next.js config, and properties in
that config do not override the separate plugin options.

### Options

Options are passed to
[`circular-dependency-plugin`](https://github.com/aackerman/circular-dependency-plugin):

- `exclude`: regular expression matching files to skip; defaults to matching nothing
- `include`: regular expression matching files to check; defaults to matching everything
- `failOnError`: defaults to `false` in development and `true` in production, using the current webpack invocation's `dev` value; an explicit boolean overrides this
- `allowAsyncCycles`: defaults to `false`
- `cwd`: defaults to `process.cwd()`
- `onStart`, `onDetected`, `onEnd`: optional compilation callbacks, forwarded unchanged

The plugin is added for both server and client webpack builds. Any existing
`webpack(config, options)` hook runs afterward with the original arguments, and
its return value is preserved. Neither the Next.js config nor the plugin options
object is mutated.

To disable detection conditionally, skip the wrapper:

```js
const { withOptions } = require('next-circular-dependency')
const nextConfig = { reactStrictMode: true }

module.exports = process.env.CHECK_CYCLES === 'true'
  ? withOptions({ failOnError: true })(nextConfig)
  : nextConfig
```

### Existing API

The default export keeps the original one-call API working:

```js
const withCircularDependency = require('next-circular-dependency')

module.exports = withCircularDependency({
  reactStrictMode: true,
  exclude: /node_modules/,
  failOnError: true
})
```

This legacy form still leaves its plugin options on the returned Next.js config.
To migrate, move them into `withOptions(pluginOptions)(nextConfig)` as shown
above. The named factory avoids changing the meaning of existing one-argument
calls to the default export.

The legacy form also retains its original hook receiver and cached defaults: if
the same wrapper is used for both development and production, the first build's
default `failOnError` value persists. The new factory computes that default for
each invocation. Set `failOnError` explicitly when you want a fixed value.

### Bundler compatibility

This package uses Next.js's
[webpack configuration hook](https://nextjs.org/docs/pages/api-reference/config/next-config-js/webpack)
and `circular-dependency-plugin` 5.x, which requires webpack 4 or newer. The
existing guard for Next.js versions below 5 is retained, but is not a guarantee
of compatibility with every newer Next.js version.

[Turbopack does not use webpack configuration or webpack plugins](https://nextjs.org/docs/app/api-reference/turbopack),
so circular-dependency detection is not available in Turbopack mode. On Next.js
versions that default to Turbopack, use the supported webpack opt-in for that
version. For example, [Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
provides `next dev --webpack` and `next build --webpack`.

The tests exercise the wrapper and the real circular-dependency plugin against
mocked webpack 4/5 compilation hooks; they do not run a full Next.js application.


## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com).

```sh
$ npm install next-circular-dependency
$ # OR
$ yarn add next-circular-dependency
```

## Contribute

Run `npm test` and `npm run lint` before submitting changes.

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am "Add some feature"`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT

## Development

The runtime and the assertion-based test suite are CommonJS. Run `npm test` to execute the 35 API and real-plugin hook tests. This command has no lint pretest hook and does not require the modern development linter.

For contributor checks, use Node.js `^20.19.0 || ^22.13.0 || >=24` and Yarn Classic:

```sh
yarn install --frozen-lockfile --ignore-scripts --ignore-optional
npm run check
```

`npm run lint` checks `index.js`, `test.js` and `eslint.config.mjs` without changing them. `npm run check` runs lint followed by the tests. `npm run format` explicitly applies lint fixes. The development Node requirement does not add an `engines` restriction or change the package's runtime support contract.

### Lint policy

ESLint 10 and ESLint Stylistic replace Standard 14 and its legacy plugins. The flat config retains the 142 core and formatting checks from `eslint-config-standard` 14.1.0: 96 remain ESLint core rules and 46 use the corresponding Stylistic rules (`func-call-spacing` becomes `@stylistic/function-call-spacing`). ESLint's current recommended checks are also enabled. Source files retain ECMAScript 2020 parsing, with CommonJS scope and only the additional globals they use (`console` and `process`).

Three option migrations preserve the old intent: `object-property-newline` uses `allowAllPropertiesOnSameLine: true` instead of its deprecated `allowMultiplePropertiesPerLine` alias; `quotes` uses `allowTemplateLiterals: 'never'` instead of `false`; and `no-inner-declarations` explicitly sets `blockScopedFunctions: 'disallow'` rather than adopting the newer permissive default.

Ten legacy plugin rules are intentionally omitted rather than pulling their old dependency trees back in:

- Import rules: `import/export`, `import/first`, `import/no-absolute-path`, `import/no-duplicates`, `import/no-named-default` and `import/no-webpack-loader-syntax`. The runtime and test files use CommonJS with simple explicit `require` paths and no ES-module imports or webpack loader imports. CommonJS parsing rejects ES-module import/export syntax in those files; the development-only `eslint.config.mjs` uses ES-module imports. The other import-specific policies are not enforced by the replacement.
- Node plugin rules: `node/no-deprecated-api` and `node/process-exit-as-throw`. The existing source uses ordinary current Node APIs, and the test runner records failures with `process.exitCode`. This config does not provide the old plugin's broader deprecated-API checks or process-exit control-flow treatment.
- Callback/promise conventions: `promise/param-names` and `standard/no-callback-literal`. There are no Promise executors or error-first callback APIs in the current source/tests. These plugin conventions are not enforced for future additions.

Standard also supplied `eslint-config-standard-jsx` 8.1.0 separately. Its 24 JSX/React checks (`jsx-quotes` and 23 `react/*` rules) and JSX parsing are intentionally omitted: this package contains no JSX or React components. The 142-check mapping above concerns `eslint-config-standard` 14.1.0, not that separate JSX configuration. Add an appropriate modern JSX policy before introducing JSX source.

The supported core checks remain, including `eqeqeq`, `no-eval`, `no-implied-eval`, `no-new-func`, `prefer-const`, `handle-callback-err` and `prefer-promise-reject-errors`. Revisit the documented omissions if the repository grows imports, asynchronous APIs or additional Node integration. This is an explicit policy migration, not a claim of complete Standard rule equivalence.

The Yarn lockfile pins the complete development graph. Modern ESLint still uses AJV for rule-option validation and minimatch for file matching; replacing Standard does not remove those package families or establish that dependencies are free of vulnerabilities. The runtime dependency remains `circular-dependency-plugin` 5.2.0 in the lockfile.
