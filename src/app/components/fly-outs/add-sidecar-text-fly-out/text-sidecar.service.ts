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

import {computed, inject, Injectable, Injector, signal} from '@angular/core';
import {PlayerService} from '../../player/player.service';
import {ToastService} from '../../../common/toast/toast.service';
import {SubtitlesVttTrack} from '@byomakase/omakase-player';
import {StringUtil} from '../../../common/util/string-util';
import {Subject} from 'rxjs';
import {AbstractSidecarTextService} from './text-sidecar.service.abstract';
import {LayoutService} from '../../layout-menu/layout.service';
import {Layout} from '../../../model/session.model';
import {SimpleLayoutSidecarTextService} from './simple-layout-text-sidecar.service';
import {StampLayoutSidecarTextService} from './stamp-layout-text-sidecar.service';

export type SidecarText = Partial<SubtitlesVttTrack> & {src: string};
export type LoadedSidecarText = SidecarText & {id: string};

@Injectable({
  providedIn: 'root',
})
export class SidecarTextService extends AbstractSidecarTextService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);
  private injector = inject(Injector);
  private activeLayout = signal<Layout>('simple');
  private currentService!: AbstractSidecarTextService;

  constructor() {
    super();
    this.layoutService.onLayoutChange$.subscribe((layout) => {
      this.setDelegateByLayout(layout);
      this.activeLayout.set(layout);
    });
  }

  /**
   * Sidecar texts that have been successfully loaded into Omakase player
   */
  public loadedSidecarTexts = computed(() => {
    if (this.activeLayout()) {
      // triggers inner signal switch
      return this.currentService.loadedSidecarTexts();
    }
    return [];
  });

  /**
   * sidecar text ids for which the user did not provide label
   */
  public noUserLabelSidecarTextIds = computed(() => {
    if (this.activeLayout()) {
      // triggers inner signal switch
      return this.currentService.noUserLabelSidecarTextIds();
    }
    return [];
  });

  /**
   * All sidecar texts in the OPCD session
   */
  public sidecarTexts = computed(() => {
    if (this.activeLayout()) {
      // triggers inner signal switch
      return this.currentService.sidecarTexts();
    }
    return [];
  });

  /**
   * Registers a sidecar text with OPCD session
   *
   * @param {SidecarText} sidecarText
   */
  public addSidecarText(sidecarText: SidecarText, showSuccessToast: boolean = true) {
    return this.currentService.addSidecarText(sidecarText, showSuccessToast);
  }

  /**
   * Reloads all sidecar texts. Since this method is usually called after Omakase player is recrated the argument
   * should capture the player state before recreation
   *
   * @param {SidecarText[]} sidecarTexts
   */
  public reloadSidecarTexts(sidecarTexts: SidecarText[]) {
    this.currentService.reloadSidecarTexts(sidecarTexts);
  }

  /**
   * Removes the sidecar text from OPCD session
   *
   * @param {SidecarText} sidecarText
   */
  public removeSidecarText(sidecarText: SidecarText) {
    this.currentService.removeSidecarText(sidecarText);
  }

  /**
   * Remove all sidecar texts from OPCD session
   */
  public removeAllSidecarTexts() {
    this.currentService.removeAllSidecarTexts();
  }

  private setDelegateByLayout(layout: Layout) {
    if (layout === 'stamp') {
      this.currentService = this.injector.get(StampLayoutSidecarTextService);
    } else {
      this.currentService = this.injector.get(SimpleLayoutSidecarTextService);
    }
  }
}
