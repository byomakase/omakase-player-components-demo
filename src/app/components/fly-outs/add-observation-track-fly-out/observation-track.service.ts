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

export interface ObservationTrack {
  id: string;
  src: string;
  label?: string;
  visualization: ObservationTrackVisualization;
  color: string;
  minValue?: number;
  maxValue?: number;
}

export type ObservationTrackVisualization = 'line-chart' | 'bar-chart' | 'led-chart';

/**
 * Service that manages observation track lifecycle in OPCD session
 */
@Injectable({
  providedIn: 'root',
})
export class ObservationTrackService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);

  public observationTracks = signal<ObservationTrack[]>([]);

  public COLORS = ['#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2', '#FFBB79', '#F57F65', '#D69D9D', '#E335FF', '#316BFF', '#15EBAB', '#EEFF2F', '#FF8E21', '#FF3306', '#FF7272'];

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
  public addObservationTrack(observationTrack: ObservationTrack, showSuccessToast: boolean = true) {
    this.observationTracks.update((prev) => [...prev, observationTrack]);

    if (showSuccessToast) {
      this.createSuccessToast();
    }
  }

  /**
   * Removes a marker track from OPCD session
   *
   * @param {MarkerTrack} observationTrack
   */
  public removeObservationTrack(observationTrack: ObservationTrack) {
    this.observationTracks.update((prev) => prev.filter((track) => track !== observationTrack));
  }

  public removeAllObservationTracks() {
    this.observationTracks.set([]);
  }

  private createSuccessToast() {
    this.toastService.show({message: 'Observation track successfully loaded', type: 'success', duration: 5000});
  }

  private createErrorToast() {
    this.toastService.show({message: 'OBservation track load failed', type: 'error', duration: 5000});
  }
}
