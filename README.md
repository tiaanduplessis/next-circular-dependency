
# next-circular-dependency
[![package version](https://img.shields.io/npm/v/next-circular-dependency.svg?style=flat-square)](https://npmjs.org/package/next-circular-dependency)
[![package downloads](https://img.shields.io/npm/dm/next-circular-dependency.svg?style=flat-square)](https://npmjs.org/package/next-circular-dependency)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/next-circular-dependency.svg?style=flat-square)](https://npmjs.org/package/next-circular-dependency)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> Detect circular dependencies in your Next.js app

## Table of Contents

- [About](#about)
- [Features](#features)
- [Usage](#usage)
- [Install](#install)
- [Contribute](#contribute)
- [License](#License)

## About

Explain the problem the package is trying to solve.

## Features

- Name key features e.g. size, performance, how it differs from similar solutions etc.

## Usage

```js
const path = require('path')
const withCSS = require('@zeit/next-css')
const optimizedImages = require('next-optimized-images')

const withNextCircularDeps = require('next-circular-dependency')

require('dotenv').config()

module.exports =  withNextCircularDeps(optimizedImages(withCSS({
  // exclude detection of files based on a RegExp
  exclude: /a\.js|node_modules/,
  // include specific files based on a RegExp
  include: /dir/,
  // add errors to webpack instead of warnings
  failOnError: true,
  // allow import cycles that include an asyncronous import,
  // e.g. via import(/* webpackMode: "weak" */ './file.js')
  allowAsyncCycles: false,
  // set the current working directory for displaying module paths
  cwd: process.cwd(),
}))
)

```


## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com).

```sh
$ npm install next-circular-dependency
$ # OR
$ yarn add next-circular-dependency
```

## Contribute

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am "Add some feature"`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT
