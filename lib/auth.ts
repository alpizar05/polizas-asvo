import type { NextAuthOptions } from "next-auth";
import GoogleProvider, {
  type GoogleProfile,
} from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/admin",
  },

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile) {
        return false;
      }

      const googleProfile = profile as GoogleProfile;

      return (
        googleProfile.email_verified === true &&
        Boolean(googleProfile.email)
      );
    },

    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
      }

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};