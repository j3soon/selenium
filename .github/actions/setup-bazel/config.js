const os = require('os')
const yaml = require('yaml')
const core = require('@actions/core')

const cacheVersion = core.getInput('cache-version')
const externalCacheConfig = yaml.parse(core.getInput('external-cache'))

const externalCache = {}
if (externalCacheConfig) {
  for (const name in externalCacheConfig) {
    externalCache[name] = Array(externalCacheConfig[name]).flat()
  }
}

const homeDir = os.homedir()
let bazelOutputBase = `${homeDir}/.bazel`
let userCacheDir = `${homeDir}/.cache`

switch (os.platform()) {
  case 'darwin':
    userCacheDir = `${homeDir}/Library/Caches`
    break
  case 'win32':
    bazelOutputBase = 'D:/_bazel'
    userCacheDir = `${homeDir}/AppData/Local`
    break
}

module.exports = {
  baseCacheKey: `setup-bazel-${cacheVersion}-${os.platform()}`,
  externalCache,
  paths: {
    bazelExternal: core.toPosixPath(`${bazelOutputBase}/external`),
    bazelOutputBase: core.toPosixPath(bazelOutputBase),
    bazelRc: core.toPosixPath(`${homeDir}/.bazelrc`),
    bazelRepository: core.toPosixPath(`${homeDir}/.cache/bazel-repo`),
    bazelisk: core.toPosixPath(`${userCacheDir}/bazelisk`)
  }
}
