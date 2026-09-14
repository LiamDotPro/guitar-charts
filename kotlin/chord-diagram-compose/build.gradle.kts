plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.android.compose.screenshot)
    alias(libs.plugins.maven.publish)
}

android {
    namespace = "com.guitarcharts.chord.compose"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        minSdk = libs.versions.minSdk.get().toInt()
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }

    experimentalProperties["android.experimental.enableScreenshotTest"] = true
}

// Publishes the release variant with sources. Shared POM fields come from ../gradle.properties.
mavenPublishing {
    publishToMavenCentral()
    // Maven Central needs signatures; publishToMavenLocal works without a key
    if (providers.gradleProperty("signingInMemoryKey").isPresent) signAllPublications()
    pom {
        name.set("Chord Diagram for Jetpack Compose")
        description.set("Guitar chord diagrams for Jetpack Compose: ChordDiagram, ChordCard, ChordSheet and SVG/PNG export.")
    }
}

androidComponents {
    onVariants { variant ->
        // ChordTokens.kt, written by `npm run generate`
        variant.sources.kotlin?.addStaticSourceDirectory("src/generated/kotlin")
    }
}

dependencies {
    api(project(":chord-diagram-core"))
    api(platform(libs.compose.bom))
    api(libs.compose.ui)
    api(libs.compose.foundation)
    implementation(libs.androidx.core)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)

    // Rendered on the JVM: ./gradlew :chord-diagram-compose:updateDebugScreenshotTest / validateDebugScreenshotTest
    screenshotTestImplementation(platform(libs.compose.bom))
    screenshotTestImplementation(libs.compose.ui.tooling)
    screenshotTestImplementation(libs.screenshot.validation.api)
}
