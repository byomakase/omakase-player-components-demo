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

import {Injectable} from '@angular/core';
import {OmakasePlayerConfig} from '@byomakase/omakase-player';
import {BehaviorSubject, Subject} from 'rxjs';
import {Layout} from '../../model/session.model';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private playerConfigs: Record<Layout, OmakasePlayerConfig> = {
    'simple': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: 'DEFAULT',
        themeConfig: {
          controlBarVisibility: 'ENABLED',
        },
      },
    },
    'audio': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'multiple',
      playerChroming: {
        theme: 'DEFAULT',
        themeConfig: {
          controlBarVisibility: 'ENABLED',
          controlBar: ['BITC', 'CAPTIONS', 'DETACH', 'FRAME_BACKWARD', 'FRAME_FORWARD', 'FULLSCREEN', 'PLAY', 'PLAYBACK_RATE', 'SCRUBBER', 'TEN_FRAMES_BACKWARD', 'TEN_FRAMES_FORWARD', 'VOLUME'],
          floatingControls: ['TRACKSELECTOR', 'HELP_MENU', 'PLAYBACK_CONTROLS'],
          trackSelectorAutoClose: false,
        },
      },
    },
    'marker': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: 'DEFAULT',
        themeConfig: {
          controlBarVisibility: 'ENABLED',
        },
      },
    },
    'timeline': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: 'DEFAULT',
        themeConfig: {
          controlBarVisibility: 'ENABLED',
        },
      },
    },
    'stamp': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: 'STAMP',
        themeConfig: {
          timeFormat: 'TIMECODE',
        },
        watermarkVisibility: 'AUTO_HIDE',
      },
    },
  };

  public onLayoutChange$: BehaviorSubject<Layout> = new BehaviorSubject<Layout>('simple');
  public onLayoutInitialized$: Subject<boolean> = new BehaviorSubject<boolean>(false);

  private _layout: Layout = 'simple';
  private _layouts: Layout[] = ['simple', 'audio', 'marker', 'timeline', 'stamp'];

  public set layout(value: Layout) {
    this._layout = value;
    this.onLayoutInitialized$.next(false);
    this.onLayoutChange$.next(value);
  }

  /**
   * Active layout
   */
  public get layout() {
    return this._layout;
  }

  /**
   * All available layouts
   */
  public get layouts(): Layout[] {
    return this._layouts;
  }

  public set layouts(value: Layout[]) {
    this._layouts = value;
  }

  /**
   * Player configuration for active layout
   */
  public get playerConfiguration() {
    return this.playerConfigs[this._layout];
  }

  constructor() {}
}
