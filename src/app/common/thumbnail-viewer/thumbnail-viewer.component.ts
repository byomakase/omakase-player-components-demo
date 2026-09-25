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

import {Component, inject, input, ChangeDetectionStrategy} from '@angular/core';
import {Thumbnail, ThumbnailTrack, TimedItemTemporalType} from '@byomakase/omakase-player';
import {ThumbnailView} from './thumbnail-view.component';
import {PlayerService} from '../../components/player/player.service';

@Component({
  selector: 'app-thumbnail-viewer',
  standalone: true,
  imports: [ThumbnailView],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="thumbnail-viewer">
      @for (thumbnail of thumbnailTrack().timedItems; track thumbnail.id) {
        <app-thumbnail-view [thumbnail]="thumbnail" (seekRequested)="seek(thumbnail)" (deleted)="deleteThumbnail(thumbnail.id)"></app-thumbnail-view>
      }
    </div>
  `,
})
export class ThumbnailViewer {
  public thumbnailTrack = input.required<ThumbnailTrack>();
  private playerService = inject(PlayerService);

  deleteThumbnail(id: string) {
    this.thumbnailTrack().deleteTimedItems(id);
  }

  seek(thumbnail: Thumbnail) {
    this.playerService.omakasePlayer!.player.pause().subscribe(() => {
      const time = thumbnail.temporal.type === TimedItemTemporalType.MOMENT ? thumbnail.temporal.time : undefined;
      if (time !== undefined) {
        this.playerService.omakasePlayer!.player.seekTo(Number(time));
      }
    });
  }
}
