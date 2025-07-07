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

import {Component, inject, Input} from '@angular/core';
import {NgbToast} from '@ng-bootstrap/ng-bootstrap';
import {ToastService} from './toast.service';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgbToast, NgClass],
  template: `
    <ngb-toast class="toast" [ngClass]="typeToClass[toast.type]" [autohide]="toast.duration !== undefined" [delay]="toast.duration ?? 0" (hidden)="toastService.remove(toast)">
      <div class="toast-content">
        <span>{{ toast.message }}</span>
      </div>
    </ngb-toast>
  `,
})
export class ToastComponent {
  @Input() toast!: Toast;

  toastService = inject(ToastService);
  typeToClass: Record<ToastType, string> = {
    'success': 'toast-success',
    'warning': 'toast-warning',
    'error': 'toast-error',
  };
}

export type ToastType = 'success' | 'warning' | 'error';

export interface Toast {
  message: string;
  type: ToastType;
  duration?: number;
}
