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

import {Observable, Subject, takeUntil} from 'rxjs';
import {Constants} from '../../../constants/constants';
import {ConfigAndStyle, ImageButton, LabelLane, LabelLaneConfig, LabelLaneStyle, OmpProvider, PlayerApi, TimelineImpl, TimelineLaneApi, TimelineNodeEventType} from '@byomakase/omakase-player';

export type GroupingLaneVisibility = 'minimized' | 'maximized';

export interface BaseGroupingLaneConfig extends LabelLaneConfig {}
export interface BaseGroupingLaneStyle extends LabelLaneStyle {}

export abstract class BaseGroupingLane<C extends BaseGroupingLaneConfig, S extends BaseGroupingLaneStyle> extends LabelLane {
  private _groupMinimizeMaximizeButton: ImageButton;

  private _childLanes: TimelineLaneApi[] = [];

  private _groupVisibility: GroupingLaneVisibility = 'maximized';

  private _onVisibilityChange$: Subject<GroupingLaneVisibility> = new Subject<GroupingLaneVisibility>();

  private _enabled: boolean = true;
  private _isPrepared: boolean = false;

  protected constructor(configAndStyle: ConfigAndStyle<C, S> & Pick<LabelLaneConfig, 'text'>) {
    super(configAndStyle);

    this._groupMinimizeMaximizeButton = new ImageButton({
      src: Constants.IMAGES.timeline.chevronDown,
      listening: true,
    });
  }

  prepareForTimeline(timeline: TimelineImpl, player: PlayerApi, ompProvider: OmpProvider): void {
    // LabelLane.prepareForTimeline is @internal in the public d.ts but exists at runtime.
    // @ts-expect-error invoking an @internal method on the parent class
    super.prepareForTimeline(timeline, player, ompProvider);

    setTimeout(() => {
      this.addTimelineNode({
        timelineNode: this._groupMinimizeMaximizeButton,
        width: 22,
        height: 22,
        justify: 'start',
        margin: [0, 5, 0, 0],
      });
    }, 100);

    this._groupMinimizeMaximizeButton.onEvent$.pipe(takeUntil(this._destroyBreaker.observer)).subscribe({
      next: (event) => {
        if (event.type === TimelineNodeEventType.TIMELINE_NODE_CLICK) this.toggleGroupVisibility();
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
      this.style.textFontSize = this._style?.textFontSize ?? Constants.DEFAULT_LABEL_TEXT_FONT_SIZE;
      //   this.onStyleChange();
      this.maximize();
      visibility === 'minimized' ? this.groupMaximize() : this.groupMinimize();
      this._enabled = true;
    } else {
      this.minimize();
      this.style.textFontSize = 0;
      //   this.onStyleChange();
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

  get description(): string {
    return this._description ?? '';
  }

  get onVisibilityChange$(): Observable<GroupingLaneVisibility> {
    return this._onVisibilityChange$;
  }
}
