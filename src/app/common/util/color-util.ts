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

  static hexToRgb(hex: string) {
    hex = hex.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  static rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return {h, s, l};
  }

  static hslToRgb(h: number, s: number, l: number) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    if (s === 0) {
      const val = Math.round(l * 255);
      return {r: val, g: val, b: val};
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1 / 3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1 / 3);

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  static getComplementaryColor(hex: string): string {
    const {r, g, b} = this.hexToRgb(hex);
    const {h, s, l} = this.rgbToHsl(r, g, b);
    const compHue = (h + 0.5) % 1; // rotate 180
    const {r: r2, g: g2, b: b2} = this.hslToRgb(compHue, s, l);
    return this.rgbToHex(r2, g2, b2);
  }

  static lightenColor(hex: string, percent: number): string {
    const {r, g, b} = this.hexToRgb(hex);
    const {h, s, l} = this.rgbToHsl(r, g, b);

    const newL = Math.min(1, l + percent / 100);

    const {r: r2, g: g2, b: b2} = this.hslToRgb(h, s, newL);
    return this.rgbToHex(r2, g2, b2);
  }

  static parseHexColor(color: string | undefined) {
    if (color === undefined) {
      return undefined;
    }

    if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
      return color;
    }

    return undefined;
  }
}

/**
 * Class implementing basic color usage heuristic.
 */
export class ColorResolver {
  private _counters: number[];
  constructor(private colors: string[]) {
    this._counters = colors.map(() => 0);
  }

  /**
   * Returns a new color picked by heuristic. Note that it does not update usage count.
   *
   * @returns {string} = color
   */
  getColor(incrementUsage: boolean = false): string {
    let maxUsageCount = Math.max(...this._counters);
    let colorIndex;
    for (let usageCount = 0; usageCount <= maxUsageCount; usageCount++) {
      const proposedColorIndex = this._counters.findIndex((usage) => usage <= usageCount);
      if (proposedColorIndex !== -1) {
        colorIndex = proposedColorIndex;
        break;
      }
    }
    const color = this.colors.at(colorIndex!)!;

    if (incrementUsage) {
      this.incrementColorUsage(color);
    }

    return color;
  }

  /**
   * Updates internal usage count for a specific color. Without calling this method, `getColor` will always
   * return the same color.
   *
   * @param {string} color
   */
  incrementColorUsage(color: string) {
    const index = this.colors.findIndex((c) => c === color);
    if (index === -1) {
      throw new Error('This color does not exist in color resolver');
    }

    this._counters[index]++;
  }

  getColorByIndex(index: number, incrementUsage: boolean = false) {
    const color = this.colors.at(index % this.colors.length)!;

    if (incrementUsage) {
      this.incrementColorUsage(color);
    }

    return color;
  }
}
