const fs = require('fs')
const os = require('os')
const yaml = require('yaml')
const core = require('@actions/core')

const cacheVersion = core.getInput('cache-version')
const externalCacheConfig = yaml.parse(core.getInput('external-cache'))

const homeDir = os.homedir()
const platform = os.platform()

const bazelRepository = core.toPosixPath(`${homeDir}/.cache/bazel-repo`)
let bazelOutputBase = `${homeDir}/.bazel`
let userCacheDir = `${homeDir}/.cache`

switch (platform) {
  case 'darwin':
    userCacheDir = `${homeDir}/Library/Caches`
    break
  case 'win32':
    bazelOutputBase = 'D:/_bazel'
    userCacheDir = `${homeDir}/AppData/Local`
    break
}

const bazelrc = core.getMultilineInput('bazelrc')

if (core.getBooleanInput('repository-cache')) {
  bazelrc.push(`build --repository_cache=${bazelRepository}`)
}

const googleCredentials = core.getInput('google-credentials')
const googleCredentialsSaved = (core.getState('google-credentials-path').length > 0)
if (googleCredentials.length > 0 && !googleCredentialsSaved) {
  const tmpDir = core.toPosixPath(fs.mkdtempSync(os.tmpdir()))
  const googleCredentialsPath = `${tmpDir}/key.json`
  fs.writeFileSync(googleCredentialsPath, googleCredentials)
  bazelrc.push(`build --google_credentials=${googleCredentialsPath}`)
  core.saveState('google-credentials-path', googleCredentialsPath)
}

const externalCache = {}
if (externalCacheConfig) {
  for (const name in externalCacheConfig) {
    externalCache[name] = Array(externalCacheConfig[name]).flat()
  }
}

module.exports = {
  baseCacheKey: `setup-bazel-${cacheVersion}-${os.platform()}`,
  bazelrc,
  externalCache,
  paths: {
    bazelExternal: core.toPosixPath(`${bazelOutputBase}/external`),
    bazelOutputBase: core.toPosixPath(bazelOutputBase),
    bazelrc: core.toPosixPath(`${homeDir}/.bazelrc`),
    bazelRepository,
    bazelisk: core.toPosixPath(`${userCacheDir}/bazelisk`)
  },
  platform
}
