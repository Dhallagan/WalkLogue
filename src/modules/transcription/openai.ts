import { getTranscriptionKey } from "../../lib/api";
import { transcodeForUpload } from "../../lib/transcode";
import { showToast } from "../../components/toast";

const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_TRANSCRIPTION_MODEL = "whisper-1";

type OpenAITranscriptionResponse = {
  text?: string;
};

export async function transcribeAudioFile(audioUri: string, signal?: AbortSignal) {
  const apiKey = await getTranscriptionKey();

  // Transcode to 16kHz mono 32kbps before upload.
  // Reduces file size ~4x. Zero quality loss for transcription.
  const uploadUri = await transcodeForUpload(audioUri);

  const formData = new FormData();
  formData.append("model", OPENAI_TRANSCRIPTION_MODEL);
  formData.append("file", {
    uri: uploadUri,
    name: buildFilename(uploadUri),
    type: guessMimeType(uploadUri),
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(OPENAI_TRANSCRIPTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal,
      body: formData,
    });
  } catch (networkError) {
    showToast("Can't reach the network. Your audio is saved, try again.");
    throw networkError;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    const requestId = response.headers.get("x-request-id");
    const requestSuffix = requestId ? ` [request ${requestId}]` : "";

    showToast(
      response.status >= 500
        ? "Transcription service is down. Try again in a moment."
        : "Couldn't transcribe this walk. Try again.",
    );

    throw new Error(
      `Transcription failed with ${response.status}${requestSuffix}: ${errorBody}`,
    );
  }

  const payload = (await response.json()) as OpenAITranscriptionResponse;

  return payload.text ?? "";
}

function buildFilename(audioUri: string) {
  const extension = audioUri.slice(audioUri.lastIndexOf("."));
  return extension ? `walk${extension}` : "walk.m4a";
}

function guessMimeType(audioUri: string) {
  if (audioUri.endsWith(".m4a")) {
    return "audio/m4a";
  }

  if (audioUri.endsWith(".mp3")) {
    return "audio/mpeg";
  }

  if (audioUri.endsWith(".wav")) {
    return "audio/wav";
  }

  if (audioUri.endsWith(".webm")) {
    return "audio/webm";
  }

  return "application/octet-stream";
}
