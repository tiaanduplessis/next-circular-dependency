import { default as CircularDependencyPlugin } from "circular-dependency-plugin";
import type { NextConfig } from "next/types";

const defaultOptions = {
  /**
   * Exclude modules from the bundle that are not used by the project.
   * This is a RegExp, so you can use e.g. /\.test/ to exclude all tests.
   * @default /node_modules/
   */
  exclude: /node_modules/,
  include: /.*/,
  /**
   * Wether to fail the build if there are circular dependencies.
   * @default false
   */
  failOnError: false,
  allowAsyncCycles: false,
  cwd: process.cwd(),
  /**
   * Log the start of the check
   * @param x 
   */
  onStart: (x) => {
    console.debug(`ℹ️ Checking ${x.compilation.name} for circular dependencies`)
  },
  /**
   * Log the end of the check
   * @param x
   */
  onEnd: undefined,
  /**
   * Log the detected circular dependency
   * @param x
   */
  onDetected: ({ paths }) => {
    console.error(`♻️ Circular dependency detected: ${paths.join(" -> ")}`);
  },
} satisfies CircularDependencyPlugin.Options;

export const nextCircularDependency = (
  dependencyPluginOptions: CircularDependencyPlugin.Options = defaultOptions,
): ((nextConfig: NextConfig) => NextConfig) => {
  return (nextConfig: NextConfig): NextConfig => {
    return {
      ...nextConfig,
      webpack(config, options) {
        config.plugins = [
          ...config.plugins,
          new CircularDependencyPlugin({
            ...defaultOptions,
            ...dependencyPluginOptions,
          }),
        ];
        if (typeof nextConfig.webpack === "function") {
          return nextConfig.webpack(config, options);
        }
        return config;
      },
    }
  };
};

export default nextCircularDependency;
