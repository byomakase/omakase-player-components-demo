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
import {NgbTooltip} from '@ng-bootstrap/ng-bootstrap';
import {ColorPickerComponent} from '../../../common/controls/color-picker/color-picker.component';
import {MarkerTrack, MarkerTrackService} from './marker-track.service';
import {MarkerTrackDisplay} from './marker-track-dispaly.component';
import {ColorService} from '../../../common/services/color.service';
import {CheckboxComponent} from '../../../common/controls/checkbox/checkbox.component';

const urlRegex = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

const COLOR_RESOLVER_ID = 'marker-fly-out';

@Component({
  selector: 'app-add-marker-track-fly-out',
  template: `
    <div class="header">
      <span>MARKER TRACKS</span>
      <i appIcon="close" (click)="close()"> </i>
    </div>
    <div class="body add-marker-track-body">
      @for (markerTrack of markerTrackService.markerTracks(); track markerTrack) {
      <app-marker-track-display [markerTrack]="markerTrack" (deleted)="deleteMarkerTrack(markerTrack)" />
      }

      <div class="add-marker-track-dialogue">
        <form [formGroup]="form">
          <div class="input-tooltip">
            <input formControlName="url" type="text" placeholder="URL" />
            <i appIcon="question" ngbTooltip="Specify the URL of a sidecar. The following formats are supported: VTT" placement="top"></i>
          </div>
          <input formControlName="label" type="text" placeholder="Label" />
          <div class="input-wrapper input-wrapper-no-margin">
            <input hidden formControlName="readOnly" type="checkbox" />
            <app-checkbox [checked]="form.controls.readOnly.value ?? undefined" (clicked)="toggleReadOnly()" />
            <label class="input-label">Read only</label>
          </div>
          <div class="input-wrapper color-picker-wrapper input-wrapper-no-margin">
            <div class="color-display" [style]="{backgroundColor: form.controls.color.value}" (click)="isColorPickerOpen.set(true)"></div>
            <label class="input-label">Color</label>
          </div>
          @if (isColorPickerOpen()) {
          <div class="color-picker-wrapper">
            <app-color-picker #colorPicker [colors]="COLORS" [activeColor]="form.controls.color.value!" (clickOutside)="closeColorPicker()" (selectedColor)="setColor($event)" />
          </div>
          }
          <div class="button-wrapper">
            <button [disabled]="isAddDisabled()" (click)="addMarkerTrack()">ADD</button>
          </div>
        </form>
      </div>
    </div>
  `,
  imports: [ReactiveFormsModule, IconDirective, MarkerTrackDisplay, NgbTooltip, ColorPickerComponent, CheckboxComponent],
})
export class AddMarkerTrackFlyOut {
  form = new FormGroup({
    label: new FormControl<string>(''),
    url: new FormControl<string>('', [allowedNameValidator(urlRegex)]),
    readOnly: new FormControl<boolean>(true),
    color: new FormControl<string>(''),
  });

  public COLORS = ['#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2', '#FFBB79', '#F57F65', '#D69D9D', '#E335FF', '#316BFF', '#15EBAB', '#EEFF2F', '#FF8E21', '#FF3306', '#FF7272'];

  private flyOutService = inject(FlyOutService);
  public markerTrackService = inject(MarkerTrackService);
  private colorService = inject(ColorService);
  public colorResolver = this.colorService.createColorResolver(COLOR_RESOLVER_ID, this.COLORS);

  public isAddDisabled = signal(true);
  public isColorPickerOpen = signal(false);

  closeColorPicker() {
    this.isColorPickerOpen.set(false);
  }

  setColor(color: string) {
    this.form.controls.color.setValue(color);
  }

  constructor() {
    this.form.controls.url.valueChanges.subscribe(() => {
      this.isAddDisabled.set(this.form.controls.url.errors != null);
    });
    this.form.controls.color.setValue(this.colorResolver.getColor());
  }

  close() {
    this.flyOutService.close();
  }

  toggleReadOnly() {
    this.form.controls.readOnly.setValue(!this.form.controls.readOnly.value);
  }

  addMarkerTrack() {
    const label = this.form.value.label === null || this.form.value.label === '' ? undefined : this.form.value.label;
    this.markerTrackService.addMarkerTrack({
      src: this.form.value.url!,
      label: label,
      color: this.form.value.color!,
      readOnly: !!this.form.value.readOnly,
    });

    this.colorResolver.incrementColorUsage(this.form.value.color!);

    this.form.reset();
    this.form.controls.color.setValue(this.colorResolver.getColor());
    this.form.controls.readOnly.setValue(true);
  }

  deleteMarkerTrack(markerTrack: MarkerTrack) {
    this.markerTrackService.removeMarkerTrack(markerTrack);
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: KeyboardEvent) {
    event.preventDefault();

    if (!this.isAddDisabled()) {
      this.addMarkerTrack();
    }
  }
}
