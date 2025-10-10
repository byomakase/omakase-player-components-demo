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

import {computed, effect, inject, Injectable, Injector, signal} from '@angular/core';
import {AbstractSidecarAudioService, SidecarAudio} from './sidecar-audio.service.abstract';
import {SimpleLayoutSidecarAudioService} from './simple-layout-sidecar-audio.service';
import {AudioLayoutSidecarAudioService} from './audio-layout-sidecar-audio.service';
import {LayoutService} from '../../../layout-menu/layout.service';
import {OmpAudioTrack} from '@byomakase/omakase-player';
import {Layout} from '../../../../model/session.model';
import {StampLayoutSidecarAudioService} from './stamp-layout-sidecar-audio.service';

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
  private activeLayout = signal<Layout>('simple');

  constructor() {
    super();

    this.layoutService.onLayoutChange$.subscribe((layout) => {
      this.setDelegateByLayout(layout);
      this.activeLayout.set(layout);
    });

    effect(() => {});
  }

  /**
   * Signal containing sidecar audios loaded into Omakase player. These
   * sidecars are playable and fully loaded
   */
  public loadedSidecarAudios = computed(() => {
    if (this.activeLayout()) {
      // triggers inner signal switch
      return this.currentService.loadedSidecarAudios();
    }
    return [];
  });

  /**
   * Signal containing Ids of loaded sidecars for which the user didn't specify a label.
   * Only contains fully loaded sidecars
   */
  public sidecarAudios = computed(() => {
    if (this.activeLayout()) {
      // triggers inner signal switch
      return this.currentService.sidecarAudios();
    }
    return [];
  });

  /**
   * Signal containing all sidecar audios that are either loaded or being loaded into Omakase player.
   * All of the loaded sidecars will have a label even if the user didn't specify one
   */
  public noUserLabelSidecarAudioIds = computed(() => {
    if (this.activeLayout()) {
      // triggers inner signal switch
      return this.currentService.noUserLabelSidecarAudioIds();
    }
    return [];
  });

  /**
   * Injects appropriate audio service instance based on currently active layout
   *
   * @param {Layout} layout - Active OPCD layout
   */
  private setDelegateByLayout(layout: Layout) {
    this.currentService?.reset();
    switch (layout) {
      case 'simple':
        this.currentService = this.injector.get(SimpleLayoutSidecarAudioService);
        break;
      case 'audio':
        this.currentService = this.injector.get(AudioLayoutSidecarAudioService);
        break;
      case 'marker':
        this.currentService = this.injector.get(SimpleLayoutSidecarAudioService);
        break;
      case 'timeline':
        this.currentService = this.injector.get(SimpleLayoutSidecarAudioService);
        break;
      case 'stamp':
        this.currentService = this.injector.get(StampLayoutSidecarAudioService);
        break;
      case 'chromeless':
        this.currentService = this.injector.get(SimpleLayoutSidecarAudioService);
        break;
      case 'editorial':
        this.currentService = this.injector.get(SimpleLayoutSidecarAudioService);
        break;
      default:
        throw new Error(`Unsupported layout: ${layout}`);
    }
  }

  /**
   * Rxjs subject that fires when selected audio track changes
   */
  get onSelectedAudioTrackChange$() {
    return this.currentService.onSelectedAudioTrackChange$;
  }

  /**
   * Registers a sidecar. Specific side effects depend on the active layout
   *
   * @param {SidecarAudio} sidecarAudio
   * @returns
   */
  addSidecarAudio(sidecarAudio: SidecarAudio, showSuccessToast: boolean = true) {
    return this.currentService.addSidecarAudio(sidecarAudio, showSuccessToast);
  }

  /**
   * Removes a sidecar. Specific side effects depend on the active layout
   *
   * @param {SidecarAudio} sidecarAudio
   * @returns
   */
  removeSidecarAudio(sidecarAudio: SidecarAudio) {
    return this.currentService.removeSidecarAudio(sidecarAudio);
  }

  /**
   * Reloads sidecar audios. This method is usually called after the player has been destroyed, the arguments should
   * capture the player state before destruction. Specific side effects depend on the active layout
   *
   * @param {SidecarAudio[]} sidecarAudios - Sidecar audios
   * @param {OmpAudioTrack[]} sidecarAudioTracks - Sidecar tracks registered with Omakase player
   */
  reloadSidecarAudios(sidecarAudios: SidecarAudio[], sidecarAudioTracks: OmpAudioTrack[]) {
    return this.currentService.reloadSidecarAudios(sidecarAudios, sidecarAudioTracks);
  }

  /**
   * Removes all sidecars from OPCD session
   * @returns
   */
  removeAllSidecarAudios() {
    return this.currentService.removeAllSidecarAudios();
  }

  /**
   * Activates a sidecar audio. Specific side effects depend on the active layout
   *
   * @param {SidecarAudio} sidecarAudio - sidecar audio to activate
   * @param {boolean} deactivateOthers - should other sidecars be deactivated
   */
  activateSidecarAudio(sidecarAudio: SidecarAudio, deactivateOthers: boolean = true) {
    return this.currentService.activateSidecarAudio(sidecarAudio, deactivateOthers);
  }

  /**
   * Deactivates all sidecar audios
   */
  deactivateAllSidecarAudios() {
    return this.currentService.deactivateAllSidecarAudios();
  }

  reset() {
    return this.currentService.reset();
  }
}
