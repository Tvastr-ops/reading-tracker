import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.readingtracker.mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.readingtracker.mobile"
        minSdk = 24
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            val keyPropsFile = rootProject.file("key.properties")
            val keyProps = Properties()
            if (keyPropsFile.exists()) {
                keyProps.load(FileInputStream(keyPropsFile))
            }
            val customStorePath = System.getenv("KEYSTORE_PATH") ?: keyProps.getProperty("storeFile")
            val targetStoreFile = if (customStorePath != null) file(customStorePath) else file("release.keystore")
            if (targetStoreFile.exists()) {
                storeFile = targetStoreFile
                storePassword = System.getenv("KEYSTORE_PASSWORD") ?: keyProps.getProperty("storePassword") ?: "paperback123"
                keyAlias = System.getenv("KEY_ALIAS") ?: keyProps.getProperty("keyAlias") ?: "paperback"
                keyPassword = System.getenv("KEY_PASSWORD") ?: keyProps.getProperty("keyPassword") ?: "paperback123"
                enableV1Signing = true
                enableV2Signing = true
            } else {
                storeFile = signingConfigs.getByName("debug").storeFile
                storePassword = signingConfigs.getByName("debug").storePassword
                keyAlias = signingConfigs.getByName("debug").keyAlias
                keyPassword = signingConfigs.getByName("debug").keyPassword
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
