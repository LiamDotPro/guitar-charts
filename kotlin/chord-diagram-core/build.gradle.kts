import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.jvm)
    `maven-publish`
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
    withSourcesJar()
}

publishing {
    publications {
        register<MavenPublication>("maven") {
            from(components["java"])
        }
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
    systemProperty("chordDiagram.golden", golden.absolutePath)
}
