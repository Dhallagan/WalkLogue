# WalkLog

WalkLog is a weekend iPhone prototype built with Expo React Native. The product
scope is intentionally narrow:

- Start a walk
- Talk freely
- End the walk
- Upload the recorded audio to OpenAI Whisper for transcription
- Save the transcript with the walk's step count
- Show today's steps on the home screen when Apple Health access is granted

There is no backend, login, paywall, or export in this version. Transcription is
currently sent directly from the app to OpenAI for prototype purposes, which is
not a production-safe secret model.

## Run locally

1. Install dependencies with `npm install`
2. Generate native projects with `npm run prebuild`
3. Run on iPhone or simulator with `npm run ios`
4. Set `EXPO_PUBLIC_OPENAI_API_KEY` before running on a real device
5. If you want Fitbit steps, set `EXPO_PUBLIC_FITBIT_CLIENT_ID` and register `walklog://fitbit` as the redirect URI in the Fitbit developer app

This project is pinned to Expo SDK 51 because the current machine is running
Node `20.6.1`. Newer Expo SDKs now require a newer Node 20 release.

## Weekend validation

Before treating the prototype as successful, manually validate:

1. A real outdoor 10-minute walk with the screen locked for part of the session
2. Whisper transcription completes and saves the entry after `End Walk`
3. Health permission granted shows a real step total on home and saves walk steps
4. Health permission denied still saves an entry with `0` steps
5. Microphone permission denied does not crash the app
6. Settings reflects real microphone/Health status and can open system settings
