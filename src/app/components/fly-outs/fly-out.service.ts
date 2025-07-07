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

import {inject, Injectable} from '@angular/core';
import {NgbOffcanvas, NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {AddMainMediaFlyOut} from './add-main-media-fly-out/add-main-media-fly-out.components';
import {AddSidecarAudioFlyOut} from './add-sidecar-audio-fly-out/add-sidecar-audio-fly-out.component';
import {AddSidecarTextFlyOut} from './add-sidecar-text-fly-out/add-sidecar-text-fly-out.component';
import {AddMarkerTrackFlyOut} from './add-markers-fly-out/add-marker-track-fly-out.component';

export type FlyOutType = 'add-main-media' | 'add-sidecar-audio' | 'add-sidecar-text' | 'add-marker-track';

const baseOffcanvasOptions: NgbOffcanvasOptions = {
  position: 'end',
  panelClass: 'base-fly-out',
};

@Injectable({
  providedIn: 'root',
})
export class FlyOutService {
  private ngbOffcanvas = inject(NgbOffcanvas);
  constructor() {}

  public open(flyOutType: FlyOutType) {
    switch (flyOutType) {
      case 'add-main-media': {
        this.ngbOffcanvas.open(AddMainMediaFlyOut, baseOffcanvasOptions);
        break;
      }
      case 'add-sidecar-audio': {
        this.ngbOffcanvas.open(AddSidecarAudioFlyOut, baseOffcanvasOptions);
        break;
      }
      case 'add-marker-track': {
        this.ngbOffcanvas.open(AddMarkerTrackFlyOut, baseOffcanvasOptions);
        break;
      }
      case 'add-sidecar-text': {
        this.ngbOffcanvas.open(AddSidecarTextFlyOut, baseOffcanvasOptions);
      }
    }
  }

  public close() {
    this.ngbOffcanvas.dismiss();
  }
}
