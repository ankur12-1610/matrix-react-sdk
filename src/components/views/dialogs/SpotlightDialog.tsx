/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, {
    ComponentProps,
    KeyboardEvent,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import { normalize } from "matrix-js-sdk/src/utils";
import { IHierarchyRoom } from "matrix-js-sdk/src/@types/spaces";
import { RoomHierarchy } from "matrix-js-sdk/src/room-hierarchy";

import { IDialogProps } from "./IDialogProps";
import { _t } from "../../../languageHandler";
import BaseDialog from "./BaseDialog";
import SearchBox from "../../structures/SearchBox";
import { BreadcrumbsStore } from "../../../stores/BreadcrumbsStore";
import RoomAvatar from "../avatars/RoomAvatar";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import {
    findSiblingElement,
    RovingAccessibleButton,
    RovingTabIndexContext,
    RovingTabIndexProvider,
    Type,
    useRovingTabIndex,
} from "../../../accessibility/RovingTabIndex";
import { Key } from "../../../Keyboard";
import AccessibleButton from "../elements/AccessibleButton";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import DMRoomMap from "../../../utils/DMRoomMap";
import { RoomType } from "matrix-js-sdk/src/@types/event";
import { mediaFromMxc } from "../../../customisations/Media";
import BaseAvatar from "../avatars/BaseAvatar";
import Spinner from "../elements/Spinner";
import { roomContextDetailsText } from "../../../Rooms";

const MAX_RECENT_SEARCHES = 10;
const SECTION_LIMIT = 50;
const RECENT_SEARCHES_LS_KEY = "mx_SpotlightDialog_recent_searches";

const Option: React.FC<ComponentProps<typeof RovingAccessibleButton>> = ({ inputRef, ...props }) => {
    const [onFocus, isActive, ref] = useRovingTabIndex(inputRef);
    return <AccessibleButton
        {...props}
        onFocus={onFocus}
        inputRef={ref}
        tabIndex={-1}
        aria-selected={isActive}
        role="option"
    />;
};

const useRecentSearches = (): Room[] => {
    const cli = MatrixClientPeg.get();

    try {
        const recents = JSON.parse(localStorage.getItem(RECENT_SEARCHES_LS_KEY));
        if (Array.isArray(recents)) {
            return recents.map(r => cli.getRoom(r)).filter(Boolean).reverse();
        }
    } catch {
        // do nothing
    }
    return [];
};

const ResultDetails = ({ room }: { room: Room }) => {
    const roomContextDetails = roomContextDetailsText(room);
    if (roomContextDetails) {
        return <div className="mx_SpotlightDialog_result_details">
            { roomContextDetails }
        </div>;
    }

    return null;
};

interface IProps extends IDialogProps {
    initialText?: string;
}

const useSpaceResults = (space?: Room, query?: string): [IHierarchyRoom[], boolean] => {
    const [rooms, setRooms] = useState<IHierarchyRoom[]>([]);
    const [hierarchy, setHierarchy] = useState<RoomHierarchy>();

    const resetHierarchy = useCallback(() => {
        const hierarchy = new RoomHierarchy(space, 50);
        setHierarchy(hierarchy);
    }, [space]);
    useEffect(resetHierarchy, [resetHierarchy]);

    useEffect(() => {
        let unmounted = false;

        (async () => {
            while (hierarchy?.canLoadMore && !unmounted && space === hierarchy.root) {
                await hierarchy.load();
                if (hierarchy.canLoadMore) hierarchy.load(); // start next load so that the loading attribute is right
                setRooms(hierarchy.rooms);
            }
        })();

        return () => {
            unmounted = true;
        };
    }, [space, hierarchy]);

    const results = useMemo(() => {
        const trimmedQuery = query.trim();
        const lcQuery = trimmedQuery.toLowerCase();
        const normalizedQuery = normalize(trimmedQuery);

        const cli = MatrixClientPeg.get();
        return rooms?.filter(r => {
            return r.room_type !== RoomType.Space &&
                cli.getRoom(r.room_id)?.getMyMembership() !== "join" &&
                (
                    normalize(r.name || "").includes(normalizedQuery) ||
                    (r.canonical_alias || "").includes(lcQuery)
                );
        });
    }, [rooms, query]);

    return [results, hierarchy?.loading ?? false];
};

const SpotlightDialog: React.FC<IProps> = ({ initialText = "", onFinished }) => {
    const cli = MatrixClientPeg.get();
    const rovingContext = useContext(RovingTabIndexContext);
    const [query, _setQuery] = useState("");
    const recentSearches = useRecentSearches();

    const results = useMemo<Room[] | null>(() => {
        if (!query) return null;

        const trimmedQuery = query.trim();
        const lcQuery = trimmedQuery.toLowerCase();
        const normalizedQuery = normalize(trimmedQuery);

        return cli.getRooms().filter(r => {
            return r.getCanonicalAlias()?.includes(lcQuery) || r.normalizedName.includes(normalizedQuery);
        });
    }, [cli, query]);

    const activeSpace = SpaceStore.instance.activeSpaceRoom;
    const [spaceResults, spaceResultsLoading] = useSpaceResults(activeSpace, query);

    const setQuery = (newQuery: string): void => {
        _setQuery(newQuery);
        if (!query !== !newQuery) {
            setImmediate(() => {
                // reset the activeRef when we start/stop querying as the view changes
                const ref = rovingContext.state.refs[0];
                if (ref) {
                    rovingContext.dispatch({
                        type: Type.SetFocus,
                        payload: { ref },
                    });
                    ref.current?.scrollIntoView({
                        block: "nearest",
                    });
                }
            });
        }
    };

    const viewRoom = (roomId: string, persist = false) => {
        if (persist) {
            const recents = new Set(recentSearches.reverse().map(r => r.roomId));
            // remove & add the room to put it at the end
            recents.delete(roomId);
            recents.add(roomId);
            localStorage.setItem(
                RECENT_SEARCHES_LS_KEY,
                JSON.stringify(Array.from(recents).slice(0, MAX_RECENT_SEARCHES)),
            );
        }

        defaultDispatcher.dispatch({
            action: 'view_room',
            room_id: roomId,
        });
        onFinished();
    };

    let content: JSX.Element;
    if (results) {
        const [people, rooms] = results.reduce((result, room: Room) => {
            result[DMRoomMap.shared().getUserIdForRoomId(room.roomId) ? 0 : 1].push(room);
            return result;
        }, [[], []] as [Room[], Room[]]);

        const resultMapper = (room: Room): JSX.Element => (
            <Option
                id={`mx_SpotlightDialog_button_result_${room.roomId}`}
                key={room.roomId}
                onClick={() => {
                    viewRoom(room.roomId, true);
                }}
            >
                <RoomAvatar room={room} width={20} height={20} />
                { room.name }
                <ResultDetails room={room} />
                <div className="mx_SpotlightDialog_enterPrompt">↵</div>
            </Option>
        );

        let peopleSection: JSX.Element;
        if (people.length) {
            peopleSection = <div className="mx_SpotlightDialog_section mx_SpotlightDialog_results" role="group">
                <h4>{ _t("People") }</h4>
                <div>
                    { people.slice(0, SECTION_LIMIT).map(resultMapper) }
                </div>
            </div>;
        }

        let roomsSection: JSX.Element;
        if (rooms.length) {
            roomsSection = <div className="mx_SpotlightDialog_section mx_SpotlightDialog_results" role="group">
                <h4>{ _t("Rooms") }</h4>
                <div>
                    { rooms.slice(0, SECTION_LIMIT).map(resultMapper) }
                </div>
            </div>;
        }

        let spaceRoomsSection: JSX.Element;
        if (spaceResults.length) {
            spaceRoomsSection = <div className="mx_SpotlightDialog_section mx_SpotlightDialog_results" role="group">
                <h4>{ _t("Other rooms in %(spaceName)s", { spaceName: activeSpace.name }) }</h4>
                <div>
                    { spaceResults.slice(0, SECTION_LIMIT).map((room: IHierarchyRoom): JSX.Element => (
                        <Option
                            id={`mx_SpotlightDialog_button_result_${room.room_id}`}
                            key={room.room_id}
                            onClick={() => {
                                viewRoom(room.room_id, true);
                            }}
                        >
                            <BaseAvatar
                                name={room.name}
                                idName={room.room_id}
                                url={room.avatar_url ? mediaFromMxc(room.avatar_url).getSquareThumbnailHttp(20) : null}
                                width={20}
                                height={20}
                            />
                            { room.name }
                            { room.canonical_alias && <div className="mx_SpotlightDialog_result_details">
                                { room.canonical_alias }
                            </div> }
                            <div className="mx_SpotlightDialog_enterPrompt">↵</div>
                        </Option>
                    )) }
                    { spaceResultsLoading && <Spinner /> }
                </div>
            </div>;
        }

        content = <>
            { peopleSection }
            { roomsSection }
            { spaceRoomsSection }
            { (results.length + spaceResults.length) === 0 ? _t("No results") : null }
        </>;
    } else {
        content = <>
            <div className="mx_SpotlightDialog_section mx_SpotlightDialog_recentlyViewed" role="group">
                <h4>{ _t("Recently viewed") }</h4>
                <div>
                    { BreadcrumbsStore.instance.rooms.map(room => (
                        <Option
                            id={`mx_SpotlightDialog_button_recentlyViewed_${room.roomId}`}
                            key={room.roomId}
                            onClick={() => {
                                viewRoom(room.roomId);
                            }}
                        >
                            <RoomAvatar room={room} width={20} height={20} />
                            { room.name }
                        </Option>
                    )) }
                </div>
            </div>

            { recentSearches.length ? (
                <div className="mx_SpotlightDialog_section mx_SpotlightDialog_recentSearches" role="group">
                    <h4>{ _t("Recent searches") }</h4>
                    <div>
                        { recentSearches.map(room => (
                            <Option
                                id={`mx_SpotlightDialog_button_recentSearch_${room.roomId}`}
                                key={room.roomId}
                                onClick={() => {
                                    viewRoom(room.roomId, true);
                                }}
                            >
                                <RoomAvatar room={room} width={20} height={20} />
                                { room.name }
                                <div className="mx_SpotlightDialog_enterPrompt">↵</div>
                            </Option>
                        )) }
                    </div>
                </div>
            ) : null }
        </>;
    }

    const onDialogKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === Key.ESCAPE) {
            ev.stopPropagation();
            ev.preventDefault();
            onFinished();
        }
    };

    const onKeyDown = (ev: KeyboardEvent) => {
        switch (ev.key) {
            case Key.ARROW_UP:
            case Key.ARROW_DOWN:
                ev.stopPropagation();
                ev.preventDefault();

                if (rovingContext.state.refs.length > 0) {
                    const idx = rovingContext.state.refs.indexOf(rovingContext.state.activeRef);
                    const ref = findSiblingElement(rovingContext.state.refs, idx + (ev.key === Key.ARROW_UP ? -1 : 1));

                    if (ref) {
                        rovingContext.dispatch({
                            type: Type.SetFocus,
                            payload: { ref },
                        });
                        ref.current?.scrollIntoView({
                            block: "nearest",
                        });
                    }
                }
                break;

            case Key.ENTER:
                ev.stopPropagation();
                ev.preventDefault();
                rovingContext.state.activeRef?.current?.click();
                break;
        }
    };

    const activeDescendant = rovingContext.state.activeRef?.current?.id;

    return <>
        <div className="mx_SpotlightDialog_keyboardPrompt">
            { _t("Use <arrows/> to scroll results", {}, {
                arrows: () => <>
                    <div>↓</div>
                    <div>↑</div>
                </>,
            }) }
        </div>

        <BaseDialog
            className="mx_SpotlightDialog"
            onFinished={onFinished}
            hasCancel={false}
            onKeyDown={onDialogKeyDown}
        >
            <SearchBox
                autoFocus
                placeholder={_t("Search for anything")}
                initialValue={initialText}
                onSearch={setQuery}
                onKeyDown={onKeyDown}
                aria-owns="mx_SpotlightDialog_content"
                aria-activedescendant={activeDescendant}
            />

            <div id="mx_SpotlightDialog_content" role="listbox" aria-activedescendant={activeDescendant}>
                { content }
            </div>
        </BaseDialog>
    </>;
};

const RovingSpotlightDialog: React.FC<IProps> = (props) => {
    return <RovingTabIndexProvider>
        { () => <SpotlightDialog {...props} /> }
    </RovingTabIndexProvider>;
};

export default RovingSpotlightDialog;
