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

import React from "react";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { render, RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
    VoiceBroadcastInfoEventType,
    VoiceBroadcastPlayback,
    VoiceBroadcastPlaybackBody,
    VoiceBroadcastPlaybackState,
} from "../../../../src/voice-broadcast";
import { mkEvent, stubClient } from "../../../test-utils";

describe("VoiceBroadcastPlaybackBody", () => {
    const userId = "@user:example.com";
    const roomId = "!room:example.com";
    let infoEvent: MatrixEvent;
    let playback: VoiceBroadcastPlayback;

    beforeAll(() => {
        stubClient();
        infoEvent = mkEvent({
            event: true,
            type: VoiceBroadcastInfoEventType,
            content: {},
            room: roomId,
            user: userId,
        });
        playback = new VoiceBroadcastPlayback(infoEvent);
    });

    describe("when rendering a broadcast", () => {
        let renderResult: RenderResult;

        beforeEach(() => {
            renderResult = render(<VoiceBroadcastPlaybackBody playback={playback} />);
        });

        it("should render as expected", () => {
            expect(renderResult.container).toMatchSnapshot();
        });

        describe("and clicking the play button", () => {
            beforeEach(async () => {
                await userEvent.click(renderResult.getByLabelText("resume voice broadcast"));
            });

            it("should stop the recording", () => {
                expect(playback.getState()).toBe(VoiceBroadcastPlaybackState.Playing);
            });
        });
    });
});
