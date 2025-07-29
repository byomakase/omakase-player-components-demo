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
  id: string;
  src: string;
  label?: string;
  color: string;
  readOnly: boolean;
}

/**
 * Service that manages marker track lifecycle in OPCD session
 */
@Injectable({
  providedIn: 'root',
})
export class MarkerTrackService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  public activeMarkerTrack = signal<MarkerTrack | undefined>(undefined);

  public markerTracks = signal<MarkerTrack[]>([]);

  public COLORS = ['multicolor', '#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2', '#FFBB79', '#F57F65', '#D69D9D', '#E335FF', '#316BFF', '#15EBAB', '#EEFF2F', '#FF8E21', '#FF3306'];
  public HEX_COLORS = ['#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2', '#FFBB79', '#F57F65', '#D69D9D', '#E335FF', '#316BFF', '#15EBAB', '#EEFF2F', '#FF8E21', '#FF3306'];
  public MULTICOLOR_COLORS = ['#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2'];

  constructor() {
    this.playerService.onCreated$.subscribe((player) => {
      if (!player) {
      }
    });
  }

  /**
   * Registers a marker track to OPCD session
   *
   * @param {MarkerTrack} markerTrack
   */
  public addMarkerTrack(markerTrack: MarkerTrack, showSuccessToast: boolean = true) {
    this.activeMarkerTrack.set(markerTrack);

    this.markerTracks.update((prev) => [...prev, markerTrack]);

    if (showSuccessToast) {
      this.createSuccessToast();
    }
  }

  /**
   * Removes a marker track from OPCD session
   *
   * @param {MarkerTrack} markerTrack
   */
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

  public removeAllMarkerTracks() {
    this.markerTracks.set([]);
    this.activeMarkerTrack.set(undefined);
  }

  private createSuccessToast() {
    this.toastService.show({message: 'Marker track successfully loaded', type: 'success', duration: 5000});
  }

  private createErrorToast() {
    this.toastService.show({message: 'Marker track load failed', type: 'error', duration: 5000});
  }
}
