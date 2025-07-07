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
import {filter, take} from 'rxjs';
import {Layout, LayoutService} from '../../components/layout-menu/layout.service';
import {SidecarAudioService} from '../../components/fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {SidecarTextService} from '../../components/fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {PlayerService} from '../../components/player/player.service';

/**
 * Service handling layout switching inside a session. All layout switches MUST be done through this service so that all loaded media is preserved.
 * Since audio sidecar service is dependant on the layout service, any bilateral interplay between the two SHOULD be handled through this service.
 * This service should function as the top most service and SHOULD NOT be injected into any other service.
 */
@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private layoutService = inject(LayoutService);
  private sidecarAudioService = inject(SidecarAudioService);
  private sidecarTextService = inject(SidecarTextService);
  private playerService = inject(PlayerService);

  public changeLayoutAndReloadMedia(layout: Layout) {
    if (this.playerService.omakasePlayer) {
      const video = this.playerService.omakasePlayer.video.getVideo();
      const videoLoadOptions = this.playerService.omakasePlayer.video.getVideoLoadOptions();

      const audioSidecars = this.sidecarAudioService.sidecarAudios();
      const noUserLabelSidecarAudioIds = this.sidecarAudioService.noUserLabelSidecarAudioIds();
      const textSidecars = this.sidecarTextService.sidecarTexts();

      this.playerService.destroy(true);
      if (video) {
        this.playerService.onCreated$
          .pipe(
            filter((p) => !!p),
            take(1)
          )
          .subscribe((player) => {
            player.loadVideo(video.sourceUrl, videoLoadOptions!).subscribe(() => {
              audioSidecars.forEach((sidecar) => {
                const label = noUserLabelSidecarAudioIds.includes(sidecar.id!) ? '' : sidecar.label;
                this.sidecarAudioService.addSidecarAudio({src: sidecar.src, label: label});
              });

              textSidecars.forEach((sidecar) => {
                const label = this.sidecarTextService.noUserLabelSidecarTextIds().includes(sidecar.id!) ? '' : sidecar.label;

                this.sidecarTextService.addSidecarText({src: sidecar.src, label: label});
              });
            });
          });
      }
      this.layoutService.onLayoutInitialized$.pipe(take(1)).subscribe(() => this.playerService.create(this.layoutService.playerConfiguration));
    }
    this.layoutService.layout = layout;
  }

  constructor() {}
}
