import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    provider?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub,
    Google,
  ],
  callbacks: {
    authorized({ auth: session }) {
      return !!session;
    },
    async jwt({ token, account }) {
      if (account) {
        (token as Record<string, unknown>).provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.provider) {
        session.provider = token.provider as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

export function getProviderStatus() {
  return {
    github: !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
    google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  };
}
