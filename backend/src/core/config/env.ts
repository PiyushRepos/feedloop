import * as dotenv from "dotenv";
dotenv.config();
import * as z from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  PORT: z.string().transform((val) => parseInt(val, 10)),
});

function createEnv(env: NodeJS.ProcessEnv): z.infer<typeof envSchema> {
  const parsedEnv = envSchema.safeParse(env);

  if (!parsedEnv.success) {
    console.error("Invalid environment variables:", parsedEnv.error.message);
    throw new Error("Invalid environment variables");
  }

  return parsedEnv.data;
}

const env = createEnv(process.env);

export default env;
