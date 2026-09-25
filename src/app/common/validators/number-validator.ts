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
 * Returns a form validation function that allows values matching provided regex
 *
 * @param {RegExp} nameRe - Regex representing a valid name
 * @returns {ValidationErrors | null}
 */
export function numberValidator(min?: number | undefined, max?: number | undefined, allowEmptyString?: boolean | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (allowEmptyString && control.value === '') {
      return null;
    }
    const parsedNumber = Number.parseFloat(control.value);
    if (Number.isNaN(parsedNumber)) {
      return {notANumber: {value: control.value}};
    }

    if (min !== undefined && parsedNumber < min) {
      return {numberTooSmall: {value: control.value}};
    }

    if (max !== undefined && parsedNumber > max) {
      return {numberTooBig: {value: control.value}};
    }

    return null;
  };
}
