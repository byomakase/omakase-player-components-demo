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

import {ClickEvent, ConfigWithOptionalStyle, SubtitlesApi, SubtitlesVttTrack, Timeline, VideoControllerApi} from '@byomakase/omakase-player';
import {BaseGroupingLane, BaseGroupingLaneConfig} from '../base-grouping-lane';
import {SidecarText} from '../../../../components/fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {TextControlImageButton} from './text-control/text-control-image-button';
import {Constants} from '../../../../constants/constants';
import {takeUntil} from 'rxjs';

export interface TextTrackGroupingLaneConfig extends BaseGroupingLaneConfig {
  textTrack: SubtitlesVttTrack | SidecarText;
  subtitlesVttTrack?: SubtitlesVttTrack;
}

export class TextTrackGroupingLane extends BaseGroupingLane<TextTrackGroupingLaneConfig> {
  private _subtitlesApi: SubtitlesApi;

  private _textTrack: SubtitlesVttTrack | SidecarText;

  private _subtitlesControlButton: TextControlImageButton;

  constructor(config: ConfigWithOptionalStyle<TextTrackGroupingLaneConfig>, subtitlesApi: SubtitlesApi) {
    super(config);

    this._subtitlesApi = subtitlesApi;

    this._textTrack = config.textTrack;

    this._subtitlesControlButton = new TextControlImageButton({
      disabled: this.isDisabled,
      srcDefault: Constants.IMAGES.timeline.chatbox,
      srcActive: Constants.IMAGES.timeline.chatboxActive,
      srcDisabled: Constants.IMAGES.timeline.chatboxDisabled,
      width: 22,
      height: 22,
    });

    this.addTimelineNode({
      timelineNode: this._subtitlesControlButton.timelineNode,
      width: this._subtitlesControlButton.dimension.width,
      height: this._subtitlesControlButton.dimension.height,
      justify: 'start',
      margin: [0, 0, 0, 0],
    });
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    if (!this.isDisabled) {
      this._subtitlesApi.onShow$.pipe(takeUntil(this._destroyed$)).subscribe({
        next: (event) => {
          this.updateStyles();
        },
      });

      this._subtitlesApi.onHide$.pipe(takeUntil(this._destroyed$)).subscribe({
        next: (event) => {
          this.updateStyles();
        },
      });

      this._subtitlesControlButton.timelineNode.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
        next: (event: ClickEvent) => {
          this.setTextTrack();
        },
      });

      this._textLabel!.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
        next: (event: ClickEvent) => {
          event.cancelableEvent.cancelBubble = true;
          this.setTextTrack();
        },
      });
    }

    this.updateStyles();
  }

  private updateStyles() {
    if (!this.isDisabled) {
      if (this.isActive) {
        this.style = Constants.LABEL_LANE_SELECTED_STYLE;
        this._subtitlesControlButton.state = 'active';
      } else {
        this.style = Constants.LABEL_LANE_STYLE;
        this._subtitlesControlButton.state = 'default';
      }
    }
  }

  setTextTrack() {
    if (!this.isDisabled) {
      if (this.isActive) {
        this._subtitlesApi.hideTrack(this._textTrack.id!);
      } else {
        this._subtitlesApi.showTrack(this._textTrack.id!);
      }
      this.updateStyles();
    }
  }

  get isActive(): boolean {
    let currentTrack = this._subtitlesApi.getActiveTrack();
    return !!currentTrack && !currentTrack.hidden && this._textTrack!.id === currentTrack.id;
  }

  get isDisabled(): boolean {
    return !this._textTrack;
  }

  get textTrack(): SubtitlesVttTrack | SidecarText {
    return this._textTrack;
  }

  set textTrack(textTrack: SubtitlesVttTrack | SidecarText) {
    this._textTrack = textTrack;
  }
}
