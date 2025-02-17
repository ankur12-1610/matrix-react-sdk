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
import { RoomMember } from "matrix-js-sdk/src/matrix";

import MemberAvatar from "../../../components/views/avatars/MemberAvatar";
import { LiveBadge } from "../..";
import { Icon, IconColour, IconType } from "../../../components/atoms/Icon";
import { _t } from "../../../languageHandler";

interface VoiceBroadcastHeaderProps {
    live: boolean;
    sender: RoomMember;
    roomName: string;
    showBroadcast?: boolean;
}

export const VoiceBroadcastHeader: React.FC<VoiceBroadcastHeaderProps> = ({
    live,
    sender,
    roomName,
    showBroadcast = false,
}) => {
    const broadcast = showBroadcast
        ? <div className="mx_VoiceBroadcastHeader_line">
            <Icon type={IconType.Live} colour={IconColour.CompoundSecondaryContent} />
            { _t("Voice broadcast") }
        </div>
        : null;
    const liveBadge = live ? <LiveBadge /> : null;
    return <div className="mx_VoiceBroadcastHeader">
        <MemberAvatar member={sender} fallbackUserId={sender.userId} />
        <div className="mx_VoiceBroadcastHeader_content">
            <div className="mx_VoiceBroadcastHeader_sender">
                { sender.name }
            </div>
            <div className="mx_VoiceBroadcastHeader_room">
                { roomName }
            </div>
            { broadcast }
        </div>
        { liveBadge }
    </div>;
};
