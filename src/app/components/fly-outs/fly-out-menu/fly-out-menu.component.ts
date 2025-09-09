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

import {Component, inject, OnDestroy, signal} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {IconDirective} from '../../../common/icon/icon.directive';
import {FlyOutService} from '../fly-out.service';
import {PlayerService} from '../../player/player.service';
@Component({
  selector: 'div[fly-out-menu]',
  imports: [IconDirective],
  template: `
    @if(flyOutService.flyoutsEnabled()) {
    <div (click)="openAddMainMedia()">
      <i appIcon="play"></i>
    </div>
    <div [class]="isVideoLoaded() && !playerService.isMainMediaAudio ? '' : 'disabled'" (click)="openAddSidecarAudio()">
      <i appIcon="sound-wave"></i>
    </div>
    <div [class]="isVideoLoaded() ? '' : 'disabled'" (click)="openAddSidecarText()">
      <i appIcon="subtitles"></i>
    </div>
    <div [class]="isVideoLoaded() ? '' : 'disabled'" (click)="openAddMarkerTrack()">
      <i appIcon="pin"></i>
    </div>
    <div [class]="isVideoLoaded() ? '' : 'disabled'" (click)="openAddObservationTrack()">
      <i appIcon="observation"></i>
    </div>
    }
  `,
})
export class FlyOutMenu implements OnDestroy {
  protected flyOutService = inject(FlyOutService);
  protected playerService = inject(PlayerService);
  isVideoLoaded = signal(false);
  private destroyed$ = new Subject<void>();

  constructor() {
    this.playerService.onCreated$.pipe(takeUntil(this.destroyed$)).subscribe((player) => {
      if (player) {
        player.video.onVideoLoaded$.pipe(takeUntil(this.destroyed$)).subscribe((videoLoadedEvent) => {
          if (videoLoadedEvent) {
            this.isVideoLoaded.set(true);
          } else {
            this.isVideoLoaded.set(false);
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  openAddMainMedia() {
    this.flyOutService.open('add-main-media');
  }

  openAddSidecarAudio() {
    if (this.isVideoLoaded() && !this.playerService.isMainMediaAudio) {
      this.flyOutService.open('add-sidecar-audio');
    }
  }

  openAddMarkerTrack() {
    if (this.isVideoLoaded()) {
      this.flyOutService.open('add-marker-track');
    }
  }

  openAddSidecarText() {
    if (this.isVideoLoaded()) {
      this.flyOutService.open('add-sidecar-text');
    }
  }

  openAddObservationTrack() {
    if (this.isVideoLoaded()) {
      this.flyOutService.open('add-observation-track');
    }
  }
}
