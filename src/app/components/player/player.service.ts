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
import {OmakasePlayer, OmakasePlayerConfig} from '@byomakase/omakase-player';
import {BehaviorSubject} from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private _omakasePlayer: OmakasePlayer | undefined;

  public onCreated$: BehaviorSubject<OmakasePlayer | undefined> = new BehaviorSubject<OmakasePlayer | undefined>(undefined);

  private _isReloading = false;

  constructor() {}

  create(config?: Partial<OmakasePlayerConfig>) {
    this.destroy();
    this._omakasePlayer = new OmakasePlayer(config);
    this.onCreated$.next(this._omakasePlayer);
    //@ts-ignore
    window.omp = this._omakasePlayer;
  }

  public get isReloading() {
    return this._isReloading;
  }

  destroy(shouldReload = false) {
    this._isReloading = shouldReload;
    if (this._omakasePlayer) {
      try {
        this._omakasePlayer.destroy();
      } catch (e) {
        console.error(e);
      }
    }

    this._omakasePlayer = undefined;
    this.onCreated$.next(this._omakasePlayer);
  }

  get omakasePlayer() {
    return this._omakasePlayer;
  }
}
