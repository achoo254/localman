import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  FIREBASE_SERVICE_ACCOUNT: z.string().min(10),
  CORS_ORIGINS: z.string().default('*'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
