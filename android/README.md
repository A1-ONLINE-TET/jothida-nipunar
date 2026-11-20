# ஜோதிட நிபுணர் — Android app (Trusted Web Activity)

A thin Android wrapper that opens the live web app <https://jothida-nipunar.pages.dev>
full-screen in the user's browser engine (Chrome), for publishing on Google Play.
It contains no astrology logic and no web content; updating the website updates the app.

- Package: `com.topperastro.jothidam`, version 1.0.0 (versionCode 1)
- Built on `com.google.androidbrowserhelper:androidbrowserhelper` 2.7.4
- minSdk 24 (required by the library), targetSdk / compileSdk 36
- Falls back to a Custom Tab when no TWA-capable browser is installed
- Notification delegation is enabled, so web push can be added later without a new app

All settings are in `app/build.gradle` (host, version, signing) and
`app/src/main/AndroidManifest.xml` (colours, splash, orientation). The host is set
once, as `hostName` in `app/build.gradle`.

## Rebuild

Needs JDK 17 or newer and the Android SDK with `platforms;android-36` and
`build-tools;36.0.0`. Gradle itself is downloaded by the wrapper.

```sh
cd android
export ANDROID_HOME=/path/to/android-sdk        # or put sdk.dir=... in local.properties
cp keystore.properties.example keystore.properties   # then fill in the real values
./gradlew clean bundleRelease assembleRelease
```

Outputs:

- `app/build/outputs/bundle/release/app-release.aab` — upload this to Play Console
- `app/build/outputs/apk/release/app-release.apk` — for installing directly on a phone

For every new Play upload, raise `versionCode` (and `versionName`) in `app/build.gradle`.

## Keystore

The upload keystore is **not** in this repository and must never be committed.
Put `upload-keystore.jks` in this `android/` folder (or anywhere, using an absolute
path) and point `keystore.properties` at it:

```properties
storeFile=upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

`keystore.properties`, `*.jks` and `local.properties` are git-ignored. Instead of the
file you can set `TWA_KEYSTORE_FILE`, `TWA_KEYSTORE_PASSWORD`, `TWA_KEY_ALIAS` and
`TWA_KEY_PASSWORD`. Without either, the build still works but the outputs are unsigned.

Keep a backup of the keystore and its password: Play accepts updates only when they
are signed with this upload key.

## Digital Asset Links (removes the browser address bar)

The app runs full-screen only when the website vouches for it. That file is
`public/.well-known/assetlinks.json` in this repository, served at
<https://jothida-nipunar.pages.dev/.well-known/assetlinks.json>. It must list the
SHA-256 fingerprint of every certificate the installed app can be signed with.

1. It already lists the **upload key**, which covers APKs built here and installed directly.
2. **After the first Play upload**, Google re-signs the app with its own key. Open
   Play Console → your app → Test and release → App integrity → Play app signing
   (older layout: Setup → App signing), copy the
   **App signing key certificate** SHA-256 fingerprint, add it as a second entry in
   `sha256_cert_fingerprints`, and deploy the website. Until this is done, the app
   installed from Play shows a browser address bar at the top.

To print the upload key's fingerprint:

```sh
keytool -list -v -keystore upload-keystore.jks -alias upload | grep SHA256
```

## Moving to a custom domain

Change `hostName` in `app/build.gradle`, raise `versionCode`, rebuild, and make sure
the new domain serves the same `/.well-known/assetlinks.json`.
