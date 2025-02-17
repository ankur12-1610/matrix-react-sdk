/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Voice Broadcast module
 * {@link https://github.com/vector-im/element-meta/discussions/632}
 */

import { RelationType } from "matrix-js-sdk/src/matrix";

export * from "./models/VoiceBroadcastPlayback";
export * from "./models/VoiceBroadcastRecording";
export * from "./audio/VoiceBroadcastRecorder";
export * from "./components/VoiceBroadcastBody";
export * from "./components/atoms/LiveBadge";
export * from "./components/atoms/PlaybackControlButton";
export * from "./components/atoms/VoiceBroadcastHeader";
export * from "./components/molecules/VoiceBroadcastPlaybackBody";
export * from "./components/molecules/VoiceBroadcastRecordingBody";
export * from "./stores/VoiceBroadcastPlaybacksStore";
export * from "./stores/VoiceBroadcastRecordingsStore";
export * from "./utils/shouldDisplayAsVoiceBroadcastRecordingTile";
export * from "./utils/shouldDisplayAsVoiceBroadcastTile";
export * from "./utils/startNewVoiceBroadcastRecording";
export * from "./hooks/useVoiceBroadcastRecording";

export const VoiceBroadcastInfoEventType = "io.element.voice_broadcast_info";
export const VoiceBroadcastChunkEventType = "io.element.voice_broadcast_chunk";

export enum VoiceBroadcastInfoState {
    Started = "started",
    Paused = "paused",
    Running = "running",
    Stopped = "stopped",
}

export interface VoiceBroadcastInfoEventContent {
    device_id: string;
    state: VoiceBroadcastInfoState;
    chunk_length?: number;
    ["m.relates_to"]?: {
        rel_type: RelationType;
        event_id: string;
    };
}
