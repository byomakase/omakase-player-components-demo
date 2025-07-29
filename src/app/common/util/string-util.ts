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

export class StringUtil {
  /**
   * Checks if a string is null, undefined or whitespace
   *
   * @param {string | undefined | null} value
   * @returns {boolean}
   */
  public static isNullUndefinedOrWhitespace(value: string | undefined | null): boolean {
    if (typeof value === void 0 || value == null) {
      return true;
    }
    return `${value}`.replace(/\s/g, '').length < 1;
  }

  /**
   * Checks if a string is empty
   *
   * @param {string | undefined | null} value
   * @returns {boolean}
   */
  public static isNonEmpty(value: string | undefined | null): boolean {
    return !StringUtil.isNullUndefinedOrWhitespace(value);
  }

  /**
   * Checks if a string ends with a suffix
   *
   * @param {string} value - string which ending is compared with suffix
   * @param {string} suffix
   * @returns {boolean} - true if value ends with suffix
   */
  public static endsWith(value: string, suffix: string): boolean {
    if (!StringUtil.isNullUndefinedOrWhitespace(value) && !StringUtil.isNullUndefinedOrWhitespace(suffix)) {
      return value.indexOf(suffix, value.length - suffix.length) !== -1;
    } else {
      return false;
    }
  }

  /**
   * Returns last part of url path, often a filename, or empty string if the argument is not valid url
   *
   * @param {string} url - whole url
   * @returns {string} - last url element
   */
  public static leafUrlToken(url: string) {
    const index = url.lastIndexOf('/');

    if (index + 1 < url.length) {
      return url.slice(index + 1);
    }

    return '';
  }

  public static decodeBase64(base64String: string) {
    try {
      return atob(base64String);
    } catch {
      return undefined;
    }
  }

  /**
   * Converts a string to mixed case
   *
   * @param value - string to be converted into mixed case
   * @returns {string} - `value` converted to mixed case
   */
  public static toMixedCase(value: string): string {
    return value
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => {
        return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
      })
      .join(' ');
  }

  /**
   * Replaces all whitespace with a specified string
   *
   * @param {string} searchValue
   * @param {string} replaceValue
   * @returns {string}
   */
  public static replaceWhitespace(searchValue: string, replaceValue: string): string {
    return searchValue
      ? searchValue
          .trim()
          .replace(/([\n ]*,[\n ]*|[\n ]+)/g, replaceValue)
          .replace(new RegExp(`${replaceValue}$`), '')
      : searchValue;
  }

  /**
   * Extract a first comment from vtt cue. Returns undefined if cue has no comments
   *
   * @param {string} cueText
   * @returns {string | undefined}
   */
  public static extractComment(cueText: string): string | undefined {
    const match = cueText.match(/:COMMENT=([^\n\r]+)/);
    if (!match) return undefined;

    const raw = match[1].trim();

    return raw;
  }

  /**
   * Removes all HTML tags from a string
   *
   * @param {string} text
   * @returns {string}
   */
  public static stripHtml(text: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return doc.documentElement.textContent || '';
  }

  /**
   * Removes all JSON objects from a string
   *
   * @param {string} text
   * @returns {string}
   */
  public static stripJson(text: string) {
    interface Accumulator {
      sanitizedString: string;
      pendingSubstring: string;
      brackets: string[];
      inString: boolean;
      escapeNext: boolean;
    }

    const acc = [...text].reduce<Accumulator>(
      (acc, char) => {
        if (acc.brackets.length) {
          acc.pendingSubstring += char;

          if (acc.inString) {
            if (acc.escapeNext) {
              acc.escapeNext = false;
            } else if (char === '\\') {
              acc.escapeNext = true;
            } else if (char === '"') {
              acc.inString = false;
            }
            return acc;
          }

          if (char === '"') {
            acc.inString = true;
            return acc;
          }

          if (char === '{' || char === '[') {
            acc.brackets.push(char);
            return acc;
          }

          if (char === '}' || char === ']') {
            const last = acc.brackets.pop();
            if ((last === '{' && char === ']') || (last === '[' && char === '}')) {
              acc.sanitizedString += acc.pendingSubstring;
              acc.pendingSubstring = '';
              acc.brackets = [];
              acc.inString = false;
              acc.escapeNext = false;
              return acc;
            }
            if (acc.brackets.length === 0) {
              try {
                JSON.parse(acc.pendingSubstring);
                acc.pendingSubstring = '';
              } catch {
                acc.sanitizedString += acc.pendingSubstring;
                acc.pendingSubstring = '';
              }
            }

            return acc;
          }

          return acc;
        }

        if (char === '{' || char === '[') {
          acc.brackets.push(char);
          acc.pendingSubstring += char;
          return acc;
        }

        acc.sanitizedString += char;
        return acc;
      },
      {
        sanitizedString: '',
        pendingSubstring: '',
        brackets: [],
        inString: false,
        escapeNext: false,
      }
    );

    return acc.sanitizedString + acc.pendingSubstring;
  }
}
