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

import {Inject, inject, Injectable, Injector} from '@angular/core';
import {OmakasePlayerConfig} from '@byomakase/omakase-player';
import {BehaviorSubject, Subject} from 'rxjs';
import {PlayerService} from '../player/player.service';

export type Layout = 'simple' | 'audio-mode' | 'marker-mode';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private playerService = inject(PlayerService);

  private playerConfigs: Record<Layout, OmakasePlayerConfig> = {
    'simple': {
      playerHTMLElementId: 'omakase-player',
      mediaChrome: {
        visibility: 'enabled',
        trackMenuMultiselect: false,
        trackMenuPlacement: 'bottom',
      },
    },
    'audio-mode': {
      playerHTMLElementId: 'omakase-player',
      mediaChrome: {
        visibility: 'enabled',
        trackMenuMultiselect: true,
        trackMenuPlacement: 'top',
        trackMenuFloating: true,
      },
    },
    'marker-mode': {
      playerHTMLElementId: 'omakase-player',
      mediaChrome: {
        visibility: 'enabled',
        trackMenuMultiselect: false,
        trackMenuPlacement: 'bottom',
      },
    },
  };

  public onLayoutChange$: BehaviorSubject<Layout> = new BehaviorSubject<Layout>('simple');
  public onLayoutInitialized$: Subject<void> = new Subject<void>();
  private _layout: Layout = 'simple';

  private injector = Inject(Injector);

  public set layout(value: Layout) {
    this._layout = value;
    this.onLayoutChange$.next(value);
  }

  public get layout() {
    return this._layout;
  }

  public get layouts(): Layout[] {
    return ['simple', 'audio-mode', 'marker-mode'];
  }

  public get playerConfiguration() {
    return this.playerConfigs[this._layout];
  }

  constructor() {}
}
