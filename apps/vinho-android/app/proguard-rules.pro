# Kotlin and Compose keep rules for smooth debugging and release builds
-keep class kotlin.Metadata { *; }
-keepclassmembers class ** {
    @androidx.annotation.Keep *;
}
-dontwarn org.jetbrains.annotations.**
-dontwarn kotlinx.coroutines.**
-dontwarn kotlin.**
