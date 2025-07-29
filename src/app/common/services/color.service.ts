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

import {Injectable} from '@angular/core';
import {ColorResolver} from '../util/color-util';

/**
 * Service used to get a color resolver with a custom ID. This allows for color resolution heuristic to
 * work throughout multiple components using the same custom ID.
 */
@Injectable({
  providedIn: 'root',
})
export class ColorService {
  private colorResolvers: Map<string, ColorResolver> = new Map();

  constructor() {}

  public createColorResolver(id: string, colors: string[]) {
    if (this.colorResolvers.has(id)) {
      return this.colorResolvers.get(id)!;
    }
    const colorResolver = new ColorResolver(colors);
    this.colorResolvers.set(id, colorResolver);

    return colorResolver;
  }

  public getColorResolver(id: string) {
    return this.colorResolvers.get(id);
  }
}
