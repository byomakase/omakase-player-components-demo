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

import {CommonModule} from '@angular/common';
import {Component, ElementRef, HostListener, input, OnInit, output} from '@angular/core';
import {IconModule} from '../../icon/icon.module';
import {ColorUtil} from '../../util/color-util';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [IconModule, CommonModule],
  template: `<div class="color-picker-container">
    <!-- @for (color of colors(); track color) {
    <div [className]="color === activeColor() ? 'color-picker-color selected' : 'color-picker-color'" [ngStyle]="{'background-color': color}" (click)="selectColor(color)"></div>
    } -->
    @for (color of colors(); track color) {
    <div class="color-picker-color" [ngStyle]="{'background-color': color}" (click)="selectColor(color)">
      @if (color === activeColor()) {
      <i appIcon="checkbox-checked" [ngStyle]="{color: checkboxColor}"></i>
      }
    </div>
    }
  </div>`,
})
export class ColorPickerComponent implements OnInit {
  colors = input.required<string[]>();
  activeColor = input<string>();

  selectedColor = output<string>();
  clickOutside = output<void>();

  public checkboxColor = '#ffffff';

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    if (this.activeColor()) {
      this.checkboxColor = ColorUtil.getContrastingTextColor(this.activeColor()!);
    }
  }

  selectColor(color: string) {
    this.selectedColor.emit(color);
    this.clickOutside.emit();
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement: HTMLElement): void {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}
