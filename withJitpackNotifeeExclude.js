const { withProjectBuildGradle } = require('@expo/config-plugins');

function withJitpackNotifeeExclude(config) {
    return withProjectBuildGradle(config, (config) => {
        const buildGradle = config.modResults.contents;

        // Ensure we don't inject multiple times
        if (buildGradle.includes('excludeGroup("app.notifee")')) {
            return config;
        }

        // We append the global repositories block interceptor to the end of allprojects
        const interceptor = `
    repositories {
        maven {
            url "$rootDir/../node_modules/@notifee/react-native/android/libs"
        }
    }
    repositories.all { repo ->
        if (repo instanceof MavenArtifactRepository) {
            def urlStr = repo.url.toString()
            if (urlStr.contains("jitpack.io")) {
                repo.content {
                    excludeGroup("app.notifee")
                }
            }
        }
    }
`;
        
        // Find the end of the allprojects block and inject our interceptor right before the closing brace
        // A simple way is to replace the last closing brace of allprojects, assuming the standard formatting
        const newContents = buildGradle.replace(
            /(allprojects\s*\{[\s\S]*?)(^\})([^}]*$)/m, 
            `$1${interceptor}$2$3`
        );

        config.modResults.contents = newContents;
        return config;
    });
}

module.exports = withJitpackNotifeeExclude;
