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

import {AfterViewInit, Component, ChangeDetectionStrategy} from '@angular/core';
import {OmakasePlayerDetached, PlayerAudioMode} from '@byomakase/omakase-player';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-detached-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <div id="omakase-player-detached"></div> `,
})
export class AppDetachedComponent implements AfterViewInit {
  constructor(private route: ActivatedRoute) {}
  ngAfterViewInit(): void {
    const isMultiAudio = this.route.snapshot.queryParams['multiAudioMode'] === 'true';
    let omakasePlayer = new OmakasePlayerDetached({
      playerHtmlElementId: 'omakase-player-detached',
      playerAudioMode: isMultiAudio ? PlayerAudioMode.MULTIPLE : PlayerAudioMode.SINGLE,
    });
  }
}
