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

import {BaseGroupingLane, BaseGroupingLaneConfig, BaseGroupingLaneStyle} from '../base-grouping-lane';
import {ConfigAndStyle, LabelLaneConfig} from '@byomakase/omakase-player';

export interface ObservationTrackGroupingLaneConfig extends BaseGroupingLaneConfig {}

export interface ObservationTrackGroupingLaneStyle extends BaseGroupingLaneStyle {}

export class ObservationTrackGroupingLane extends BaseGroupingLane<ObservationTrackGroupingLaneConfig, ObservationTrackGroupingLaneStyle> {
  constructor(configAndStyle: ConfigAndStyle<ObservationTrackGroupingLaneConfig, ObservationTrackGroupingLaneStyle> & Pick<LabelLaneConfig, 'text'>) {
    super(configAndStyle);
  }
}
