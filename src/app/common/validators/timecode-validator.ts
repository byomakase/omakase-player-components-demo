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

import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

/**
 * Returns a form validation function that validates timecode based on provided frame rate
 * and drop frame
 *
 * @param {number | undefined} framerate
 * @param {boolean} dropFrame
 * @returns {ValidationErrors | null}
 */
export function timecodeValidator(framerate: number | undefined, dropFrame = false, isAudio = false): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    let valid = true;

    if (control.value === '') {
      return null;
    }

    const lastDelimiter = isAudio ? '.' : dropFrame ? ';' : ':';

    if (control.value.at(-3) !== lastDelimiter) {
      valid = false;
    } else {
      const splitTimecode = control.value.split(/[:;.]/).map((el) => Number.parseInt(el));

      if (splitTimecode.length !== 4 || splitTimecode.includes(NaN)) {
        valid = false;
      } else {
        valid = splitTimecode.at(1)! < 60 && splitTimecode.at(2)! < 60;

        if (framerate != undefined && !Number.isNaN(framerate)) {
          valid = valid && splitTimecode.at(3)! < framerate;
        }
      }
    }

    return !valid ? {forbiddenName: {value: control.value}} : null;
  };
}
