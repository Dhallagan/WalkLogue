import { useEffect, useRef, useState } from "react";
import Constants from "expo-constants";
import {
  AVAudioSessionCategory,
  AVAudioSessionCategoryOptions,
  AVAudioSessionMode,
  ExpoSpeechRecognitionModule,
  addSpeechRecognitionListener,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

type SessionSnapshot = {
  transcript: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
};

export function useWalkCapture() {
  const [transcript, setTranscript] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const finalChunksRef = useRef<string[]>([]);
  const partialChunkRef = useRef("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSimulatorSpeechFallback = detectSimulatorSpeechFallback();

  useEffect(() => {
    if (isSimulatorSpeechFallback) {
      return;
    }

    const resultSubscription = addSpeechRecognitionListener(
      "result",
      handleResultEvent,
    );
    const errorSubscription = addSpeechRecognitionListener(
      "error",
      handleErrorEvent,
    );

    return () => {
      resultSubscription.remove();
      errorSubscription.remove();
      void ExpoSpeechRecognitionModule.abort();
      clearElapsedTimer();
    };
  }, [isSimulatorSpeechFallback]);

  async function start() {
    setErrorMessage(null);

    if (!startedAt) {
      setStartedAt(new Date());
    }

    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((current) => current + 1);
      }, 1000);
    }

    setIsPaused(false);
    setIsRecording(true);

    if (isSimulatorSpeechFallback) {
      setTranscript(
        "Simulator mode: speech capture is disabled here. Use a physical iPhone to test live transcription.",
      );
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      iosTaskHint: "dictation",
      iosCategory: {
        category: AVAudioSessionCategory.playAndRecord,
        categoryOptions: [
          AVAudioSessionCategoryOptions.defaultToSpeaker,
          AVAudioSessionCategoryOptions.allowBluetooth,
        ],
        mode: AVAudioSessionMode.measurement,
      },
    });
  }

  async function pause() {
    if (!isRecording) {
      return;
    }

    if (isSimulatorSpeechFallback) {
      setIsRecording(false);
      setIsPaused(true);
      clearElapsedTimer();
      return;
    }

    ExpoSpeechRecognitionModule.stop();
    await waitForRecognizerToStop();
    setIsRecording(false);
    setIsPaused(true);
    clearElapsedTimer();
  }

  async function resume() {
    await start();
  }

  async function finish(): Promise<SessionSnapshot> {
    if (isRecording && !isSimulatorSpeechFallback) {
      ExpoSpeechRecognitionModule.stop();
      await waitForRecognizerToStop();
    }

    clearElapsedTimer();
    setIsRecording(false);
    setIsPaused(false);

    const endTime = new Date();
    const sessionStart = startedAt ?? new Date(endTime.getTime() - elapsedSeconds * 1000);
    const combinedTranscript = isSimulatorSpeechFallback
      ? transcript
      : buildTranscript(finalChunksRef.current, partialChunkRef.current);

    return {
      transcript: combinedTranscript.trim(),
      startedAt: sessionStart,
      endedAt: endTime,
      durationSec: elapsedSeconds,
    };
  }

  function reset() {
    finalChunksRef.current = [];
    partialChunkRef.current = "";
    setTranscript("");
    setElapsedSeconds(0);
    setIsRecording(false);
    setIsPaused(false);
    setStartedAt(null);
    setErrorMessage(null);
    clearElapsedTimer();
  }

  function handleResultEvent(event: ExpoSpeechRecognitionResultEvent) {
    const candidate = event.results[0]?.transcript?.trim();

    if (!candidate) {
      return;
    }

    if (event.isFinal) {
      finalChunksRef.current = appendUniqueChunk(finalChunksRef.current, candidate);
      partialChunkRef.current = "";
    } else {
      partialChunkRef.current = candidate;
    }

    setTranscript(buildTranscript(finalChunksRef.current, partialChunkRef.current));
  }

  function handleErrorEvent(event: ExpoSpeechRecognitionErrorEvent) {
    if (event.error === "aborted") {
      return;
    }

    setErrorMessage(event.message);
    setIsRecording(false);
    clearElapsedTimer();
  }

  function clearElapsedTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  return {
    transcript,
    elapsedSeconds,
    isRecording,
    isPaused,
    errorMessage,
    isSimulatorSpeechFallback,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}

function appendUniqueChunk(chunks: string[], chunk: string) {
  const normalized = chunk.trim();

  if (!normalized) {
    return chunks;
  }

  if (chunks[chunks.length - 1] === normalized) {
    return chunks;
  }

  return [...chunks, normalized];
}

function buildTranscript(chunks: string[], partial: string) {
  return [...chunks, partial.trim()].filter(Boolean).join("\n\n");
}

async function waitForRecognizerToStop() {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const state = await ExpoSpeechRecognitionModule.getStateAsync();

    if (state === "inactive") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

function detectSimulatorSpeechFallback() {
  const deviceName = Constants.deviceName?.trim().toLowerCase();
  const iosModel = Constants.platform?.ios?.model?.trim().toLowerCase();

  if (!__DEV__ || !deviceName || !iosModel) {
    return false;
  }

  return deviceName === iosModel;
}
