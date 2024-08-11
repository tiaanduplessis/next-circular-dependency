
# @playt/next-circular-dependency

> Detect circular dependencies in your Next.js app

## Usage

Add the plugin to your `next.config.mjs` file like so:

```ts
import nextCircularDependency from '@playt/next-circular-dependency'

/** @type {import('next').NextConfig} */
let config = {}

// the options of the webpack plugin
// Ref.: https://github.com/aackerman/circular-dependency-plugin
const options = {}

config = nextCircularDependency(options)(config)

export default config
```


## Install

```sh
npm i -D @playt/next-circular-dependency
```

## License

MIT
