pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "chord-diagram"

include(":chord-diagram-core")     // pure Kotlin/JVM layout + SVG, no Android
include(":chord-diagram-compose")  // Jetpack Compose views + export
include(":sample")                 // demo app
