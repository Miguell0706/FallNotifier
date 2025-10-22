# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# ✅ KEEP GOOGLE MAPS + PLAY SERVICES
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }
-keep class com.google.android.libraries.places.** { *; }

# ✅ KEEP REACT-NATIVE-MAPS MODULE
-keep class com.airbnb.android.react.maps.** { *; }

# ✅ SOMETIMES NEEDED FOR GMS CORE
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.dynamite.** { *; }
