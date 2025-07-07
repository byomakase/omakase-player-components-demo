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

import {Component, HostListener, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {FlyOutService} from '../fly-out.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {allowedNameValidator} from '../../../common/validators/allowed-name-validator';
import {SidecarDisplay} from '../add-sidecar-audio-fly-out/sidecar-display.component';
import {SidecarTextService} from './text-sidecar.service';
import {NgbTooltip} from '@ng-bootstrap/ng-bootstrap';

const urlRegex = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

@Component({
  selector: 'app-add-sidecar-text-fly-out',
  template: `
    <div class="header">
      <span>TEXT SIDECARS</span>
      <i appIcon="close" (click)="close()"> </i>
    </div>
    <div class="body add-sidecar-body">
      <div class="sidecar-container">
        @for (sidecarText of sidecarTextService.sidecarTexts(); track sidecarText) {
        <app-sidecar-display
          [isDeletable]="sidecarText.id != undefined"
          [url]="sidecarText.src"
          [label]="sidecarText.id && sidecarTextService.noUserLabelSidecarTextIds().includes(sidecarText.id) ? '' : sidecarText.label"
          (deleted)="sidecarTextService.removeSidecarText(sidecarText)"
        >
        </app-sidecar-display>
        }
      </div>

      <form [formGroup]="form">
        <div class="add-sidecar-dialogue">
          <div class="input-tooltip">
            <input formControlName="url" type="text" placeholder="URL" />
            <i appIcon="question" ngbTooltip="Specify the URL of a sidecar. The following formats are supported: VTT" placement="top"></i>
          </div>
          <input formControlName="label" type="text" placeholder="Label" />
          <div class="button-wrapper">
            <button [disabled]="isAddDisabled()" (click)="addSidecarText()">ADD</button>
          </div>
        </div>
      </form>
    </div>
  `,
  imports: [ReactiveFormsModule, IconDirective, SidecarDisplay, NgbTooltip],
})
export class AddSidecarTextFlyOut {
  form = new FormGroup({
    label: new FormControl(''),
    url: new FormControl('', [allowedNameValidator(urlRegex)]),
  });

  private flyOutService = inject(FlyOutService);
  public sidecarTextService = inject(SidecarTextService);

  public isAddDisabled = signal(true);

  constructor() {
    this.form.controls.url.valueChanges.subscribe(() => {
      this.isAddDisabled.set(this.form.controls.url.errors != null);
    });
  }

  close() {
    this.flyOutService.close();
  }

  addSidecarText() {
    this.sidecarTextService.addSidecarText({
      src: this.form.value.url!,
      label: this.form.value.label ?? '',
    });

    this.form.reset();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: KeyboardEvent) {
    event.preventDefault();

    if (!this.isAddDisabled()) {
      this.addSidecarText();
    }
  }
}
