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

import {Component, effect, HostListener, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {FlyOutService} from '../fly-out.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {allowedNameValidator} from '../../../common/validators/allowed-name-validator';
import {NgbTooltip} from '@ng-bootstrap/ng-bootstrap';
import {SidecarAudioService} from './sidecar-audio-service/sidecar-audio.service';
import {SidecarDisplay} from '../common/sidecar-display.component';

const urlRegex = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

@Component({
  selector: 'app-add-sidecar-audio-fly-out',
  template: `
    <div class="header">
      <span>AUDIO SIDECARS</span>
      <i appIcon="close" (click)="close()"> </i>
    </div>
    <div class="body add-sidecar-body">
      <div class="sidecar-container">
        @for (sidecarAudio of sidecarAudioService.sidecarAudios(); track sidecarAudio) {
        <app-sidecar-display
          [isDeletable]="sidecarAudio.id != undefined"
          [url]="sidecarAudio.src"
          [isLoading]="sidecarAudio.id == undefined"
          [label]="sidecarAudio.id && sidecarAudioService.noUserLabelSidecarAudioIds().includes(sidecarAudio.id) ? '' : sidecarAudio.label"
          (deleted)="sidecarAudioService.removeSidecarAudio(sidecarAudio)"
        >
        </app-sidecar-display>
        }
      </div>
      <form [formGroup]="form">
        <div class="add-sidecar-dialogue">
          <div class="input-tooltip">
            <input formControlName="url" type="text" placeholder="URL" />
            <i appIcon="question" ngbTooltip="Specify the URL of a sidecar. The following formats are supported: AAC, AC3, MP4" placement="top"></i>
          </div>
          <input formControlName="label" type="text" placeholder="Label" />
          <div class="button-wrapper">
            <button [disabled]="isAddDisabled()" (click)="addSidecarAudio()">ADD</button>
          </div>
        </div>
      </form>
    </div>
  `,
  imports: [ReactiveFormsModule, IconDirective, SidecarDisplay, NgbTooltip],
})
export class AddSidecarAudioFlyOut {
  form = new FormGroup({
    label: new FormControl(''),
    url: new FormControl('', [allowedNameValidator(urlRegex)]),
  });

  private flyOutService = inject(FlyOutService);
  public sidecarAudioService = inject(SidecarAudioService);
  // public sidecarAudioService;
  public isAddDisabled = signal(true);

  constructor() {
    this.form.controls.url.valueChanges.subscribe(() => {
      this.isAddDisabled.set(this.form.controls.url.errors != null);
    });

    effect(() => {
      console.log(this.sidecarAudioService.sidecarAudios());
      console.log(this.sidecarAudioService);
    });
  }

  close() {
    this.flyOutService.close();
  }

  addSidecarAudio() {
    this.sidecarAudioService.addSidecarAudio({
      src: this.form.value.url!,
      label: this.form.value.label ?? '',
    });

    this.form.reset();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: KeyboardEvent) {
    event.preventDefault();

    if (!this.isAddDisabled()) {
      this.addSidecarAudio();
    }
  }
}
