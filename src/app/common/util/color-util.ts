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

export class ColorUtil {
  static getContrastingTextColor(backgroundColor: string): string {
    if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(backgroundColor)) {
      throw new Error('Invalid hex color format.');
    }

    const hex = backgroundColor.length === 4 ? '#' + [...backgroundColor.slice(1)].map((char) => char + char).join('') : backgroundColor;

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const luminance = (channel: number) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const relativeLuminance = 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);

    return relativeLuminance > 0.5 ? '#000000' : '#ffffff';
  }
}

export class ColorResolver {
  private _counters: number[];
  constructor(private colors: string[]) {
    this._counters = colors.map(() => 0);
  }

  getColor(): string {
    let maxUsageCount = Math.max(...this._counters);
    let colorIndex;
    for (let usageCount = 0; usageCount <= maxUsageCount; usageCount++) {
      const proposedColorIndex = this._counters.findIndex((usage) => usage <= usageCount);
      if (proposedColorIndex !== -1) {
        colorIndex = proposedColorIndex;
        break;
      }
    }
    return this.colors.at(colorIndex!)!;
  }

  incrementColorUsage(color: string) {
    const index = this.colors.findIndex((c) => c === color);
    if (index === -1) {
      throw new Error('This color does not exist in color resolver');
    }

    this._counters[index]++;
  }
}
