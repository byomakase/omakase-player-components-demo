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
  type: z.enum(['audio', 'text', 'marker', 'thumbnail']),
  url: z.url(),
});

const presentationSchema = z.object({
  layouts: z.array(z.enum(['simple', 'audio', 'marker', 'timeline', 'stamp'])),
  read_only: z.boolean().optional(),
});

const mediaSchema = z.object({
  main: z.array(mainMediaSchema),
  sidecars: z.array(sidecarMediaSchema).optional(),
});

export const sessionSchema = z.object({
  presentation: presentationSchema.optional(),
  media: mediaSchema.optional(),
});
