/**
 * Environment Validation
 *
 * Validates required environment variables at startup.
 * Never logs secret values. Fails clearly when required config is missing.
 *
 * Provider-specific vars are checked based on AI_PROVIDER so unused
 * providers do not produce noisy warnings.
 */

export interface EnvValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const REQUIRED_SERVER_VARS = [
  "DATABASE_URL",
] as const;

type ProviderType = "xai" | "openrouter" | "ollama";

function resolveProvider(): ProviderType {
  const raw = (process.env.AI_PROVIDER || "xai").toLowerCase();
  if (raw === "openrouter" || raw === "ollama" || raw === "xai") {
    return raw;
  }
  return "xai";
}

export function getConfiguredAIProvider(): ProviderType {
  return resolveProvider();
}

const WEAK_SECRETS = [
  "nextmsg-dev-secret-change-in-production",
  "change-me",
  "secret",
  "password",
] as const;

export function validateEnvironment(): EnvValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const provider = resolveProvider();
  const isProd = isProduction();

  for (const varName of REQUIRED_SERVER_VARS) {
    if (!process.env[varName]) {
      errors.push(`${varName} is not configured`);
    }
  }

  const knownProviders = ["xai", "openrouter", "ollama"];
  const rawProvider = process.env.AI_PROVIDER;
  if (rawProvider && !knownProviders.includes(rawProvider.toLowerCase())) {
    errors.push(
      `AI_PROVIDER="${rawProvider}" is invalid — must be one of: ${knownProviders.join(", ")}`
    );
  }

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    if (isProd) {
      errors.push("AUTH_SECRET is not configured — authentication will not work in production");
    } else {
      warnings.push("AUTH_SECRET is not configured — authentication will not work");
    }
  } else if (isProd && WEAK_SECRETS.includes(authSecret as typeof WEAK_SECRETS[number])) {
    errors.push("AUTH_SECRET is a known weak value — generate a strong secret for production");
  }

  if (provider === "xai") {
    if (!process.env.XAI_API_KEY) {
      warnings.push("XAI_API_KEY is not configured — xAI provider will not function");
    }
  } else if (provider === "openrouter") {
    if (!process.env.OPENROUTER_API_KEY) {
      warnings.push("OPENROUTER_API_KEY is not configured — OpenRouter provider will not function");
    }
  } else if (provider === "ollama") {
    if (!process.env.OLLAMA_BASE_URL) {
      warnings.push(
        "OLLAMA_BASE_URL is not set — defaulting to http://localhost:11434"
      );
    }
    if (!process.env.OLLAMA_MODEL) {
      warnings.push("OLLAMA_MODEL is not set — defaulting to qwen3:8b");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getEnv(name: string, fallback: string = ""): string {
  return process.env[name] || fallback;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDebugAI(): boolean {
  return process.env.NEXTMSG_DEBUG_AI === "true";
}
