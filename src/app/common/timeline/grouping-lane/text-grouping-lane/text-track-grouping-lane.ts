/*
 * Copyright 2025 ByOmakase, LLC (https://byomakase.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {BaseGroupingLane, BaseGroupingLaneConfig, BaseGroupingLaneStyle} from '../base-grouping-lane';
import {SidecarText} from '../../../../components/fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {TextControlImageButton} from './text-control/text-control-image-button';
import {Constants} from '../../../../constants/constants';
import {filter, takeUntil} from 'rxjs';
import {ConfigAndStyle, LabelLane, LabelLaneConfig, OmpProvider, PlayerApi, PlayerTextApi, PlayerTextEventType, TextTrack, TimelineImpl, TimelineNodeEventType} from '@byomakase/omakase-player';

export interface TextTrackGroupingLaneConfig extends BaseGroupingLaneConfig {
  textTrack: TextTrack | SidecarText;
}

export interface TextTrackGroupingLaneStyle extends BaseGroupingLaneStyle {}

export class TextTrackGroupingLane extends BaseGroupingLane<TextTrackGroupingLaneConfig, TextTrackGroupingLaneStyle> {
  private _textApi: PlayerTextApi;
  private _textTrack: TextTrack | SidecarText;
  private _subtitlesControlButton: TextControlImageButton;

  constructor(configAndStyle: ConfigAndStyle<TextTrackGroupingLaneConfig, TextTrackGroupingLaneStyle> & Pick<TextTrackGroupingLaneConfig, 'text' | 'textTrack'>, textApi: PlayerTextApi) {
    super(configAndStyle);

    this._textApi = textApi;
    this._textTrack = configAndStyle.textTrack;

    this._subtitlesControlButton = new TextControlImageButton({
      disabled: this.isDisabled,
      srcDefault: Constants.IMAGES.timeline.chatbox,
      srcActive: Constants.IMAGES.timeline.chatboxActive,
      srcDisabled: Constants.IMAGES.timeline.chatboxDisabled,
      width: 22,
      height: 22,
    });
  }

  override prepareForTimeline(timeline: TimelineImpl, player: PlayerApi, ompProvider: OmpProvider): void {
    super.prepareForTimeline(timeline, player, ompProvider);

    this.addTimelineNode({
      timelineNode: this._subtitlesControlButton.timelineNode,
      width: this._subtitlesControlButton.dimension.width,
      height: this._subtitlesControlButton.dimension.height,
      justify: 'start',
      margin: [0, 0, 0, 0],
    });

    if (!this.isDisabled) {
      this._textApi.onEvent$
        .pipe(
          takeUntil(this._destroyBreaker.observer)
          // filter((event) => event.type === PlayerTextEventType.PLAYER_TEXT_CHANGE)
        )
        .subscribe(() => {
          this.updateStyles();
        });

      this._subtitlesControlButton.timelineNode.onEvent$.pipe(takeUntil(this._destroyBreaker.observer)).subscribe({
        next: (event) => {
          if (event.type === TimelineNodeEventType.TIMELINE_NODE_CLICK) {
            this.setTextTrack();
          }
        },
      });

      this._textLabel!.onEvent$.pipe(takeUntil(this._destroyBreaker.observer)).subscribe({
        next: (event) => {
          if (event.type === TimelineNodeEventType.TIMELINE_NODE_CLICK) {
            this.setTextTrack();
          }
        },
      });
    }

    this.updateStyles();
  }

  private updateStyles() {
    if (!this.isDisabled) {
      if (this.isActive) {
        this.setStyle(Constants.LABEL_LANE_SELECTED_STYLE);
        this._subtitlesControlButton.state = 'active';
      } else {
        this.setStyle(Constants.LABEL_LANE_STYLE);
        this._subtitlesControlButton.state = 'default';
      }
    }
  }

  setTextTrack() {
    if (!this.isDisabled) {
      if (this.isActive) {
        this._textApi.switchTrack(this._textTrack.id!, false).subscribe();
      } else {
        this._textApi.switchTrack(this._textTrack.id!).subscribe();
      }
    }
  }

  get isActive(): boolean {
    const allTracks = [...(this._textApi.state.tracks['MAIN'] ?? []), ...(this._textApi.state.tracks['SIDECAR'] ?? [])];
    const activeTrack = allTracks.find((t) => t.active && t.shown);
    return !!activeTrack && activeTrack.trackId === this._textTrack.id;
  }

  get isDisabled(): boolean {
    return !this._textTrack;
  }

  get textTrack(): TextTrack | SidecarText {
    return this._textTrack;
  }

  set textTrack(textTrack: TextTrack | SidecarText) {
    this._textTrack = textTrack;
  }
}
