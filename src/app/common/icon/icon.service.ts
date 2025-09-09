/*
 * Copyright 2024 ByOmakase, LLC (https://byomakase.org)
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

import {Injectable} from '@angular/core';
import {IconOmakaseLogo} from './svg/icon-omakase-logo';
import {IconClose} from './svg/icon-close';
import {IconDelete} from './svg/icon-delete';
import {IconPlayButton} from './svg/icon-play-button';
import {IconSoundWave} from './svg/icon-sound-wave';
import {IconSubtitles} from './svg/icon-subtitles';
import {IconPin} from './svg/icon-pin';
import {IconQuestion} from './svg/icon-question';
import {IconMenu} from './svg/icon-menu';
import {IconCheckboxChecked} from './svg/icon-checkbox-checked';
import {IconCheckboxUnchecked} from './svg/icon-checkbox-unchecked';
import {IconArrowRight} from './svg/icon-arrow-right';
import {IconArrowLeft} from './svg/icon-arrow-left';
import {IconObservation} from './svg/icon-observation';
import {IconCheckboxCheckedDisabled} from './svg/icon-checkbox-checked-disabled';
import {IconCheckboxUncheckedDisabled} from './svg/icon-checkbox-unchecked-disabled';

export type IconName =
  | 'omakase-logo'
  | 'close'
  | 'delete'
  | 'play'
  | 'sound-wave'
  | 'subtitles'
  | 'pin'
  | 'question'
  | 'menu'
  | 'checkbox-checked'
  | 'checkbox-unchecked'
  | 'checkbox-checked-disabled'
  | 'checkbox-unchecked-disabled'
  | 'arrow-right'
  | 'arrow-left'
  | 'observation';

@Injectable({
  providedIn: 'root',
})
export class IconService {
  private _icons: Record<IconName, string> = {
    'omakase-logo': IconOmakaseLogo,
    'close': IconClose,
    'delete': IconDelete,
    'play': IconPlayButton,
    'sound-wave': IconSoundWave,
    'subtitles': IconSubtitles,
    'pin': IconPin,
    'question': IconQuestion,
    'menu': IconMenu,
    'checkbox-checked': IconCheckboxChecked,
    'checkbox-unchecked': IconCheckboxUnchecked,
    'checkbox-checked-disabled': IconCheckboxCheckedDisabled,
    'checkbox-unchecked-disabled': IconCheckboxUncheckedDisabled,
    'arrow-right': IconArrowRight,
    'arrow-left': IconArrowLeft,
    'observation': IconObservation,
  };

  constructor() {}

  getIconHtml(name: IconName): string {
    return this._icons[name];
  }

  get icons(): Record<IconName, string> {
    return this._icons;
  }
}
