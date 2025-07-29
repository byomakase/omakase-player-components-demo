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

import {ClickEvent, ConfigWithOptionalStyle, ImageButton, LabelLane, LabelLaneConfig, Timeline, TimelineLaneApi, VideoControllerApi} from '@byomakase/omakase-player';
import {Observable, Subject, takeUntil} from 'rxjs';
import {Constants} from '../../../constants/constants';

export type GroupingLaneVisibility = 'minimized' | 'maximized';

export interface BaseGroupingLaneConfig extends LabelLaneConfig {}

export abstract class BaseGroupingLane<C extends BaseGroupingLaneConfig> extends LabelLane {
  private _groupMinimizeMaximizeButton: ImageButton;

  private _childLanes: TimelineLaneApi[] = [];

  private _groupVisibility: GroupingLaneVisibility = 'maximized';

  private _onVisibilityChange$: Subject<GroupingLaneVisibility> = new Subject<GroupingLaneVisibility>();

  private _enabled: boolean = true;

  protected constructor(config: ConfigWithOptionalStyle<C>) {
    super(config);

    this._groupMinimizeMaximizeButton = new ImageButton({
      src: Constants.IMAGES.timeline.chevronDown,
      listening: true,
    });

    this.addTimelineNode({
      timelineNode: this._groupMinimizeMaximizeButton,
      width: 22,
      height: 22,
      justify: 'start',
      margin: [0, 5, 0, 0],
    });
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    this._groupMinimizeMaximizeButton.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event: ClickEvent) => {
        this.toggleGroupVisibility();
      },
    });
  }

  addChildLane(lane: TimelineLaneApi) {
    this._childLanes.push(lane);
  }

  toggleGroupVisibility() {
    let newGroupVisibility: GroupingLaneVisibility = this._groupVisibility === 'minimized' ? 'maximized' : 'minimized';

    newGroupVisibility === 'minimized' ? this.groupMinimize() : this.groupMaximize();
  }

  groupMinimize() {
    this._groupMinimizeMaximizeButton.setImage({
      src: Constants.IMAGES.timeline.chevronRight,
    });

    this._timeline?.minimizeTimelineLanes(this._childLanes);
    this.groupVisibility = 'minimized';
  }

  groupMaximize() {
    this._groupMinimizeMaximizeButton.setImage({
      src: Constants.IMAGES.timeline.chevronDown,
    });

    this._timeline?.maximizeTimelineLanes(this._childLanes);
    this.groupVisibility = 'maximized';
  }

  toggleHidden(visibility: GroupingLaneVisibility) {
    if (this.isMinimized()) {
      this.style.textFontSize = this._config.style.textFontSize;
      this.onStyleChange();
      this.maximize();
      visibility === 'minimized' ? this.groupMaximize() : this.groupMinimize();
      this._enabled = true;
    } else {
      this.minimize();
      this.style.textFontSize = 0;
      this.onStyleChange();
      this.groupMinimize();
      this._enabled = false;
    }
  }

  get groupVisibility(): GroupingLaneVisibility {
    return this._groupVisibility;
  }

  get isEnabled(): boolean {
    return this._enabled;
  }

  private set groupVisibility(visibility: GroupingLaneVisibility) {
    this._groupVisibility = visibility;
    this._onVisibilityChange$.next(visibility);
  }

  get childLanes(): TimelineLaneApi[] {
    return this._childLanes;
  }

  override get description(): string {
    return this._description ?? '';
  }

  get onVisibilityChange$(): Observable<GroupingLaneVisibility> {
    return this._onVisibilityChange$;
  }
}
