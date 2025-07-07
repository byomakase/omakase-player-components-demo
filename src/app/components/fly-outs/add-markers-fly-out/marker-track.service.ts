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

import {inject, Injectable, signal} from '@angular/core';
import {ToastService} from '../../../common/toast/toast.service';
import {PlayerService} from '../../player/player.service';

export interface MarkerTrack {
  src: string;
  label?: string;
  color: string;
  readOnly: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MarkerTrackService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  public activeMarkerTrack = signal<MarkerTrack | undefined>(undefined);

  public markerTracks = signal<MarkerTrack[]>([]);

  constructor() {
    this.playerService.onCreated$.subscribe((player) => {
      if (!player) {
      }
    });
  }

  public addMarkerTrack(markerTrack: MarkerTrack) {
    this.activeMarkerTrack.set(markerTrack);

    this.markerTracks.update((prev) => [...prev, markerTrack]);
    this.createSuccessToast();
  }

  public removeMarkerTrack(markerTrack: MarkerTrack) {
    this.markerTracks.update((prev) => prev.filter((track) => track !== markerTrack));

    if (markerTrack === this.activeMarkerTrack()) {
      if (this.markerTracks().length > 0) {
        this.activeMarkerTrack.set(this.markerTracks().at(0));
      } else {
        this.activeMarkerTrack.set(undefined);
      }
    }
  }

  private createSuccessToast() {
    this.toastService.show({message: 'Marker track successfully loaded', type: 'success', duration: 5000});
  }

  private createErrorToast() {
    this.toastService.show({message: 'Marker track load failed', type: 'error', duration: 5000});
  }
}
