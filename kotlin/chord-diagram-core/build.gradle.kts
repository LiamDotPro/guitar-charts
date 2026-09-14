import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.maven.publish)
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

// Shared POM fields (url, license, scm, developer) come from ../gradle.properties.
mavenPublishing {
    publishToMavenCentral()
    // Maven Central needs signatures; publishToMavenLocal works without a key
    if (providers.gradleProperty("signingInMemoryKey").isPresent) signAllPublications()
    pom {
        name.set("Chord Diagram Core")
        description.set("Guitar chord diagram layout for the JVM: a chord shape in, drawing primitives and SVG out. No Android dependency.")
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
    // ChordMetrics.kt / ChordLibrary.kt, written by `npm run generate`
    sourceSets.main {
        kotlin.srcDir("src/generated/kotlin")
    }
}

dependencies {
    testImplementation(kotlin("test"))
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.kotlinx.serialization.json)
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.test {
    useJUnitPlatform()
    val golden = rootProject.file("../shared/fixtures/golden.json")
    inputs.file(golden).withPathSensitivity(PathSensitivity.RELATIVE)
    inputs.file(rootProject.file("../shared/fixtures/fuzz.json")).withPathSensitivity(PathSensitivity.RELATIVE)
    systemProperty("chordDiagram.golden", golden.absolutePath)
}
