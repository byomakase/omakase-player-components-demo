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

import {Component, HostBinding, HostListener, inject, OnInit} from '@angular/core';
import {PlayerService} from './player.service';
import {OmakasePlayerUtil} from '../../common/util/omakase-player-util';
import {WindowService} from '../../common/browser/window.service';
import {LayoutService} from '../layout-menu/layout.service';
@Component({
  selector: 'app-player',
  imports: [],
  host: {'id': 'omakase-player'},
  template: ` <ng-content></ng-content> `,
})
export class PlayerComponent implements OnInit {
  protected playerService = inject(PlayerService);
  private windowService = inject(WindowService);
  private layoutService = inject(LayoutService);

  constructor() {}

  ngOnInit(): void {
    this.playerService.onCreated$.subscribe((player) => {
      this.displayBackgroundDiv = player === undefined && !this.playerService.isReloading;

      if (player) {
        document.querySelector('media-controller')?.setAttribute('nohotkeys', ''); // disable media chrome hot keys
        if (this.resolveHelpMenuSupport()) {
          player.video.clearHelpMenuGroups();

          player.video.appendHelpMenuGroup(OmakasePlayerUtil.getKeyboardShortcutsHelpMenuGroup(this.windowService.platform));
        }
      }
    });
  }

  private resolveHelpMenuSupport() {
    const theme = this.layoutService.playerConfiguration.playerChroming?.theme;
    if (theme === 'CHROMELESS' || theme === 'STAMP') {
      return false;
    }
    return true;
  }

  @HostBinding('class.omakase-player-div')
  displayBackgroundDiv = true;

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (this.playerService.omakasePlayer) {
      const isHandled = OmakasePlayerUtil.handleKeyboardEvent(event, this.playerService.omakasePlayer, this.windowService.userAgent);
      if (isHandled) {
        event.preventDefault();
      }
    }
  }
}
