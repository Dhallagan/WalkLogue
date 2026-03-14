# WalkLog

WalkLog is a weekend iPhone prototype built with Expo React Native. The product
scope is intentionally narrow:

- Start a walk
- Talk freely
- End the walk
- Save the transcript with the walk's step count

There is no backend, AI, login, paywall, export, or background capture in this
version.

## Run locally

1. Install dependencies with `npm install`
2. Generate native projects with `npm run prebuild`
3. Run on iPhone or simulator with `npm run ios`

This project is pinned to Expo SDK 51 because the current machine is running
Node `20.6.1`. Newer Expo SDKs now require a newer Node 20 release.

## Weekend validation

Before treating the prototype as successful, manually validate:

1. A real outdoor 10-minute walk with live speech capture
2. Health permission denied still saves an entry with `0` steps
3. Microphone/speech permission denied does not crash the app
4. Manual entries persist after killing and reopening the app
