import { FFmpegKit, ReturnCode } from "ffmpeg-kit-react-native";
import * as FileSystem from "expo-file-system/legacy";

/**
 * Transcode audio to voice-optimized format for Whisper transcription.
 * Input: any audio format (m4a, wav, etc.)
 * Output: 16kHz mono AAC at 32kbps (~4x smaller than HIGH_QUALITY recording)
 *
 * Whisper internally downsamples to 16kHz mono anyway, so this loses
 * zero transcription quality while dramatically reducing upload size.
 *
 * Returns the path to the transcoded file, or the original path if
 * transcoding fails (graceful fallback).
 */
export async function transcodeForUpload(inputUri: string): Promise<string> {
  try {
    const outputPath = `${FileSystem.cacheDirectory}transcribe_${Date.now()}.m4a`;

    const command = [
      "-i", inputUri,
      "-ac", "1",          // mono
      "-ar", "16000",      // 16kHz sample rate
      "-b:a", "32k",       // 32kbps bitrate
      "-y",                // overwrite
      outputPath,
    ].join(" ");

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      return outputPath;
    }

    // Transcoding failed, fall back to original
    return inputUri;
  } catch {
    // FFmpeg not available or crashed, fall back to original
    return inputUri;
  }
}
