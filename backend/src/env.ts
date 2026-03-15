import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default('./localman-36eac-firebase-adminsdk-fbsvc-e4898843d3.json'),
  CORS_ORIGINS: z.string().default('*'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
