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
