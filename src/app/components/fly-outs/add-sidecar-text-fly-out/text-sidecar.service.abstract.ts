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

import {OmpAudioTrack} from '@byomakase/omakase-player';
import {Signal} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {LoadedSidecarText, SidecarText} from './text-sidecar.service';

export type SidecarAudio = Partial<OmpAudioTrack> & {src: string};

export abstract class AbstractSidecarTextService {
  abstract loadedSidecarTexts: Signal<LoadedSidecarText[]>;
  abstract noUserLabelSidecarTextIds: Signal<string[]>;
  abstract sidecarTexts: Signal<SidecarText[]>;

  abstract addSidecarText(sidecarText: SidecarText, showSuccessToast: boolean): Observable<boolean>;
  abstract removeSidecarText(sidecarText: SidecarText): void;
  abstract reloadSidecarTexts(sidecarTexts: SidecarText[]): void;
  abstract removeAllSidecarTexts(): void;
}
