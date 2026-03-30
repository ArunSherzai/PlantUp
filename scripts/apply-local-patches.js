const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const patches = [
  {
    file: path.join(
      repoRoot,
      'node_modules',
      'react-native-nitro-modules',
      'android',
      'src',
      'main',
      'java',
      'com',
      'margelo',
      'nitro',
      'NitroModulesPackage.kt'
    ),
    from: `        ReactModuleInfo(
          NitroModules.NAME,
          NitroModules.NAME,
          canOverrideExistingModule = false,
          needsEagerInit = false,
          isCxxModule = false,
          isTurboModule = isTurboModule,
        )`,
    to: `        ReactModuleInfo(
          NitroModules.NAME,
          NitroModules.NAME,
          false,
          false,
          false,
          isTurboModule,
        )`,
  },
  {
    file: path.join(
      repoRoot,
      'node_modules',
      'react-native-unistyles',
      'android',
      'CMakeLists.txt'
    ),
    from: `# For React Native 0.76 and above, we don't need to link anything
# as NitroModules will automatically add ReactAndroid::reactnative prefab
if (ReactAndroid_VERSION_MINOR LESS 78)
    message(FATAL_ERROR "Unistyles 3.0 requires min. React Native version to be 0.78")
endif ()`,
    to: `# This app is pinned to React Native 0.76.x. The package metadata also declares
# support for >=0.76.0, so keep the Android native build enabled for that range.
if (ReactAndroid_VERSION_MINOR LESS 76)
    message(FATAL_ERROR "react-native-unistyles requires min. React Native version to be 0.76")
endif ()`,
  },
];

for (const patch of patches) {
  if (!fs.existsSync(patch.file)) {
    continue;
  }

  const original = fs.readFileSync(patch.file, 'utf8');
  if (original.includes(patch.to)) {
    continue;
  }
  if (!original.includes(patch.from)) {
    throw new Error(`Patch target not found in ${patch.file}`);
  }

  fs.writeFileSync(patch.file, original.replace(patch.from, patch.to), 'utf8');
}
