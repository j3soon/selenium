const os = require('os')
const yaml = require('yaml')
const core = require('@actions/core')

const homeDir = os.homedir()
const bazelOutputBase = `${homeDir}/.bazel`

const cacheVersion = core.getInput('cache-version')
const externalCacheConfig = yaml.parse(core.getInput('external-cache'))

const externalCache = {}
if (externalCacheConfig) {
  for (const name in externalCacheConfig) {
    externalCache[name] = Array(externalCacheConfig[name]).flat()
  }
}

let userCacheDir = `${homeDir}/.cache`
switch (os.type()) {
  case 'Darwin':
    userCacheDir = `${homeDir}/Library/Caches`
    break
  case 'Windows':
    userCacheDir = `${homeDir}/AppData/Local`
    break
}

module.exports = {
  baseCacheKey: `setup-bazel-${cacheVersion}-${os.platform()}`,
  externalCache,
  paths: {
    bazelExternal: `${bazelOutputBase}/external`,
    bazelOutputBase,
    bazelRc: `${homeDir}/.bazelrc`,
    bazelRepository: `${homeDir}/.cache/bazel-repo`,
    bazelisk: `${userCacheDir}/bazelisk`
  }
}
