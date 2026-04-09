import { getApiBaseUrl, getApiSecret } from "../../lib/api";

const OPENAI_TRANSCRIPTION_MODEL = "whisper-1";

type OpenAITranscriptionResponse = {
  text?: string;
};

export async function transcribeAudioFile(audioUri: string, signal?: AbortSignal) {
  const formData = new FormData();
  formData.append("model", OPENAI_TRANSCRIPTION_MODEL);
  formData.append("file", {
    uri: audioUri,
    name: buildFilename(audioUri),
    type: guessMimeType(audioUri),
  } as unknown as Blob);

  const response = await fetch(`${getApiBaseUrl()}/api/transcribe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiSecret()}`,
      Accept: "application/json",
    },
    signal,
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const requestId = response.headers.get("x-request-id");
    const requestSuffix = requestId ? ` [request ${requestId}]` : "";

    throw new Error(
      `OpenAI transcription failed with ${response.status}${requestSuffix}: ${errorBody}`,
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
