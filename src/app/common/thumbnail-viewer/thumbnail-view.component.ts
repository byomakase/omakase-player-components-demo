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

import {afterNextRender, Component, computed, ElementRef, inject, input, output} from '@angular/core';
import {MediaTemporalFormat, MomentTemporal, Thumbnail, TimedItemTemporalType} from '@byomakase/omakase-player';
import {IconDirective} from '../icon/icon.directive';
import {PlayerService} from '../../components/player/player.service';

@Component({
  selector: 'app-thumbnail-view',
  standalone: true,
  imports: [IconDirective],
  template: `
    <div class="thumbnail-view">
      <img alt="keyframe" [src]="thumbnail().state.url" />
      <div class="thumbnail-overlay">
        <div class="thumbnail-overlay-actions">
          <i appIcon="download" class="thumbnail-action" (click)="download($event)"></i>
          <i appIcon="trash-can" class="thumbnail-action" (click)="delete($event)"></i>
        </div>
        <span class="thumbnail-timecode" (click)="timecodeClick($event)">{{ timecode() }}</span>
      </div>
    </div>
  `,
})
export class ThumbnailView {
  public thumbnail = input.required<Thumbnail>();
  public deleted = output<void>();
  public seekRequested = output<number>();
  private playerService = inject(PlayerService);

  private el = inject(ElementRef);

  constructor() {
    afterNextRender(() => {
      const img: HTMLImageElement = this.el.nativeElement.querySelector('img');
      img
        .decode() // workaround for safari -> makes sure that the image is decoded and scroll functions well
        .catch(() => {})
        .then(() => this.el.nativeElement.scrollIntoView({behavior: 'smooth', block: 'end'}));
    });
  }

  timecode = computed(() => {
    const thumbnail = this.thumbnail();
    if (thumbnail.temporal.type === TimedItemTemporalType.MOMENT) {
      return this.playerService.omakasePlayer!.player.convertTime(Number(thumbnail.temporal.time), MediaTemporalFormat.SECONDS, MediaTemporalFormat.TIMECODE);
    }
    return '';
  });

  download(event: Event) {
    event.stopPropagation();
    const a = document.createElement('a');
    a.href = this.thumbnail().state.url;
    a.download = `${crypto.randomUUID()}.jpg`;
    a.click();
  }

  delete(event: Event) {
    event.stopPropagation();
    this.deleted.emit();
  }

  timecodeClick(event: Event) {
    event.stopPropagation();
    if (this.thumbnail().temporal.type === TimedItemTemporalType.MOMENT) {
      this.seekRequested.emit(parseFloat((this.thumbnail().temporal as MomentTemporal).time));
    }
  }
}
