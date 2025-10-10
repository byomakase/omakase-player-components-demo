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

import {z} from 'zod';

const mainMediaSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  url: z.url(),
  frame_rate: z.union([z.string(), z.number().gt(0)]).optional(),
  drop_frame: z.boolean().optional(),
  ffom: z.string().optional(),
});

const sidecarMediaSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  type: z.enum(['audio', 'text', 'marker', 'thumbnail', 'observation']),
  url: z.url(),
});

export const chartTypeSchema = z.enum(['bar_chart', 'line_chart', 'led_chart']);

export const trackVisualizationSchema = z.object({
  chart_type: chartTypeSchema.optional(),
  read_only: z.boolean().optional(),
  color: z.string().optional(),
  y_min: z.number().optional(),
  y_max: z.number().optional(),
});

export const presentationSchema = z.object({
  layouts: z.array(z.enum(['simple', 'audio', 'marker', 'timeline', 'stamp', 'chromeless', 'editorial'])),
  read_only: z.boolean().optional(),
  track_visualization: z.record(z.string(), trackVisualizationSchema).optional(),
  disable_media_fly_outs: z.boolean().optional(),
});

const mediaSchema = z.object({
  main: z.array(mainMediaSchema),
  sidecars: z.array(sidecarMediaSchema).optional(),
});

export const sessionSchema = z.object({
  presentation: presentationSchema.optional(),
  media: mediaSchema.optional(),
});
