/*
Copyright 2019 New Vector Ltd

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

import React from 'react';
import PropTypes from 'prop-types';
import {_t} from "../../../../../languageHandler";
import MatrixClientPeg from "../../../../../MatrixClientPeg";
import Pill from "../../../elements/Pill";
import {makeUserPermalink} from "../../../../../utils/permalinks/Permalinks";
import BaseAvatar from "../../../avatars/BaseAvatar";
import { ContentRepo } from "matrix-js-sdk";

const BRIDGE_EVENT_TYPES = [
    "uk.half-shot.bridge",
    // m.bridge
];

export default class BridgeSettingsTab extends React.Component {
    static propTypes = {
        roomId: PropTypes.string.isRequired,
    };

    constructor() {
        super();

        this.state = {
        };
    }

    componentWillMount() {

    }

    _renderBridgeCard(event, room) {
        const content = event.getContent();
        if (!content || !content.channel || !content.protocol) {
            return null;
        }
        const { channel, network } = content;
        const protocolName = content.protocol.displayname || content.protocol.id;
        const channelName = channel.displayname || channel.id;
        const networkName = network ? network.displayname || network.id : "";
        let status = null;
        if (content.status === "active") {
            status = (<p> Status: <b>Active</b> </p>);
        } else if (content.status === "disabled") {
            status = (<p> Status: <b>Disabled</b> </p>);
        }

        let creator = null;
        if (content.creator) {
            creator = (<p>
                This bridge was provisioned by <Pill
                    type={Pill.TYPE_USER_MENTION}
                    room={room}
                    url={makeUserPermalink(content.creator)}
                    shouldShowPillAvatar={true}
                />
            </p>);
        }

        const bot = (<p>
            The bridge is managed by the <Pill
            type={Pill.TYPE_USER_MENTION}
            room={room}
            url={makeUserPermalink(event.getSender())}
            shouldShowPillAvatar={true}
            /> bot user.</p>
        );
        let channelLink = channelName;
        if (channel.external_url) {
            channelLink = <a target="_blank" href={channel.external_url}>{channelName}</a>;
        }

        let networkLink = networkName;
        if (network && network.external_url) {
            networkLink = <a target="_blank" href={network.external_url}>{networkName}</a>;
        }

        const chanAndNetworkInfo = (
            <p> Bridged into {channelLink} {networkLink}, on {protocolName}</p>
        );

        let networkIcon = null;
        if (networkName && network.avatar) {
            const avatarUrl = ContentRepo.getHttpUriForMxc(
                MatrixClientPeg.get().getHomeserverUrl(),
                network.avatar, 32, 32, "crop",
            );
            networkIcon = <BaseAvatar width={32} height={32} resizeMethod='crop'
                            name={ networkName } idName={ networkName }
                            url={ avatarUrl } />;
        }

        let channelIcon = null;
        if (channel.avatar) {
            const avatarUrl = ContentRepo.getHttpUriForMxc(
                MatrixClientPeg.get().getHomeserverUrl(),
                channel.avatar, 32, 32, "crop",
            );
            console.log(channel.avatar);
            channelIcon = <BaseAvatar width={32} height={32} resizeMethod='crop'
                            name={ networkName } idName={ networkName }
                            url={ avatarUrl } />;
        }

        return (<li key={event.stateKey}>
            <div>
                <h3>{channelIcon} {channelName} {networkName ? ` on ${networkName}` : ""} {networkIcon}</h3>
                <p> Connected via {protocolName} </p>
                <details>
                    {status}
                    {creator}
                    {bot}
                    {chanAndNetworkInfo}
                </details>
            </div>
        </li>);
    }

    static getBridgeStateEvents(roomId) {
        const client = MatrixClientPeg.get();
        const roomState = (client.getRoom(roomId)).currentState;

        const bridgeEvents = Array.concat(...BRIDGE_EVENT_TYPES.map((typeName) =>
            Object.values(roomState.events[typeName] || {}),
        ));

        return bridgeEvents;
    }

    render() {
        // This settings tab will only be invoked if the following function returns more
        // than 0 events, so no validation is needed at this stage.
        const bridgeEvents = BridgeSettingsTab.getBridgeStateEvents(this.props.roomId);
        const client = MatrixClientPeg.get();
        const room = client.getRoom(this.props.roomId);

        return (
            <div className="mx_SettingsTab">
                <div className="mx_SettingsTab_heading">{_t("Bridge Info")}</div>
                <div className='mx_SettingsTab_section mx_SettingsTab_subsectionText'>
                    <p> Below is a list of bridges connected to this room. </p>
                    <ul className="mx_RoomSettingsDialog_BridgeList">
                        { bridgeEvents.map((event) => this._renderBridgeCard(event, room)) }
                    </ul>
                </div>
            </div>
        );
    }
}
