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

import {inject, Injectable, Injector} from '@angular/core';
import {AbstractSidecarAudioService, SidecarAudio} from './sidecar-audio.service.abstract';
import {SimpleLayoutSidecarAudioService} from './simple-layout-sidecar-audio.service';
import {AudioLayoutSidecarAudioService} from './audio-layout-sidecar-audio.service';
import {Layout, LayoutService} from '../../../layout-menu/layout.service';
import {OmpAudioTrack} from '@byomakase/omakase-player';

/**
 * Service handling sidecar audio lifecycle management. On layout change the service method implementations should be changed. To make it more robust,
 * "service proxy" is used with dynamic delegation of requested method to a service corresponding to current layout. All components MUST use this service
 * instead of more specific ones to ensure consistency on layout changes.
 */
@Injectable({
  providedIn: 'root',
})
export class SidecarAudioService extends AbstractSidecarAudioService {
  private layoutService = inject(LayoutService);
  private injector = inject(Injector);
  private currentService!: AbstractSidecarAudioService;

  constructor() {
    super();

    this.layoutService.onLayoutChange$.subscribe((layout) => {
      this.setDelegateByLayout(layout);
    });
  }

  private setDelegateByLayout(layout: Layout) {
    switch (layout) {
      case 'simple':
        this.currentService = this.injector.get(SimpleLayoutSidecarAudioService);
        break;
      case 'audio-mode':
        this.currentService = this.injector.get(AudioLayoutSidecarAudioService);
        break;
      case 'marker-mode':
        this.currentService = this.injector.get(SimpleLayoutSidecarAudioService);
        break;
      default:
        throw new Error(`Unsupported layout: ${layout}`);
    }
  }

  get onSelectedAudioTrackChange$() {
    return this.currentService.onSelectedAudioTrackChange$;
  }

  get loadedSidecarAudios() {
    return this.currentService.loadedSidecarAudios;
  }

  get noUserLabelSidecarAudioIds() {
    return this.currentService.noUserLabelSidecarAudioIds;
  }

  get sidecarAudios() {
    return this.currentService.sidecarAudios;
  }

  addSidecarAudio(sidecarAudio: SidecarAudio) {
    return this.currentService.addSidecarAudio(sidecarAudio);
  }

  removeSidecarAudio(sidecarAudio: SidecarAudio) {
    return this.currentService.removeSidecarAudio(sidecarAudio);
  }

  reloadSidecarAudios(sidecarAudios: SidecarAudio[], sidecarAudioTracks: OmpAudioTrack[]) {
    return this.currentService.reloadSidecarAudios(sidecarAudios, sidecarAudioTracks);
  }

  removeAllSidecarAudios() {
    return this.currentService.removeAllSidecarAudios();
  }

  activateSidecarAudio(sidecarAudio: SidecarAudio, muteOthers: boolean = true) {
    return this.currentService.activateSidecarAudio(sidecarAudio, muteOthers);
  }

  deactivateAllSidecarAudios() {
    return this.currentService.deactivateAllSidecarAudios();
  }
}
