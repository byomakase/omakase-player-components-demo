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
  public static isNullUndefinedOrWhitespace(value: string | undefined | null): boolean {
    if (typeof value === void 0 || value == null) {
      return true;
    }
    return `${value}`.replace(/\s/g, '').length < 1;
  }

  public static isNonEmpty(value: string | undefined | null): boolean {
    return !StringUtil.isNullUndefinedOrWhitespace(value);
  }

  public static endsWith(value: string, suffix: string): boolean {
    if (!StringUtil.isNullUndefinedOrWhitespace(value) && !StringUtil.isNullUndefinedOrWhitespace(suffix)) {
      return value.indexOf(suffix, value.length - suffix.length) !== -1;
    } else {
      return false;
    }
  }

  public static leafUrlToken(url: string) {
    const index = url.lastIndexOf('/');

    if (index + 1 < url.length) {
      return url.slice(index + 1);
    }

    return '';
  }

  public static toMixedCase(value: string): string {
    return value
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => {
        return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
      })
      .join(' ');
  }

  public static replaceWhitespace(searchValue: string, replaceValue: string): string {
    return searchValue
      ? searchValue
          .trim()
          .replace(/([\n ]*,[\n ]*|[\n ]+)/g, replaceValue)
          .replace(new RegExp(`${replaceValue}$`), '')
      : searchValue;
  }

  public static whitespacesToCommas(searchValue: string): string {
    return StringUtil.replaceWhitespace(searchValue, ',');
  }

  public static tokenizeWhitespaceSeparated(value: string): string[] | undefined {
    return value ? StringUtil.replaceWhitespace(value, ' ').split(' ') : void 0;
  }

  public static replaceLastOccurrence(str: string, searchString: string, replaceString: string): string {
    const lastIndex = str.lastIndexOf(searchString);
    if (lastIndex === -1) {
      return str;
    }

    return str.substring(0, lastIndex) + replaceString + str.substring(lastIndex + searchString.length);
  }

  public static extractComment(cueText: string): string | undefined {
    const match = cueText.match(/:COMMENT=([^\n\r]+)/);
    if (!match) return undefined;

    const raw = match[1].trim();

    return raw;
  }

  public static stripHtml(text: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return doc.documentElement.textContent || '';
  }

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

// @ts-ignore
window.sa = StringUtil;
