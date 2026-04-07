import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Emails that are always treated as admin
const ADMIN_EMAILS = [
  "mackenziedrury17@gmail.com",
];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow credentials sign-in to pass through
      if (account?.provider === "credentials") return true;

      // For OAuth (Google), verify email is confirmed before linking
      if (account?.provider === "google" && user.email) {
        // Check if email is verified on the Google account
        const emailVerified = (profile as { email_verified?: boolean })?.email_verified;
        if (!emailVerified) {
          console.warn(`Rejecting Google sign-in: email ${user.email} not verified on Google account`);
          return false;
        }

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        if (existingUser) {
          // Check if Google account is already linked
          const alreadyLinked = existingUser.accounts.some(
            (a) => a.provider === "google"
          );

          if (!alreadyLinked) {
            // Link Google account to existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token as string | undefined,
                refresh_token: account.refresh_token as string | undefined,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token as string | undefined,
              },
            });
          }

          // Update name/image from Google if missing
          if (!existingUser.image && user.image) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { image: user.image },
            });
          }

          // Override the user object so the JWT gets the right ID
          user.id = existingUser.id;
          return true;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { billingStatus: true, strategyMode: true, config: true, role: true, email: true },
        });
        if (dbUser) {
          token.billingStatus = dbUser.billingStatus;
          const config = dbUser.config as Record<string, unknown> | null;
          token.onboardingCompleted = config?.onboarding_completed === true;
          token.isDemo = config?.is_demo === true;
          token.strategyMode = dbUser.strategyMode;
          // Admin: check role field OR hardcoded email list
          token.isAdmin = dbUser.role === "admin" || ADMIN_EMAILS.includes(dbUser.email);

          // Auto-promote hardcoded admins in DB if not already set
          if (ADMIN_EMAILS.includes(dbUser.email) && dbUser.role !== "admin") {
            await prisma.user.update({
              where: { id: token.id as string },
              data: { role: "admin" },
            });
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.billingStatus = token.billingStatus as string;
        session.user.onboardingCompleted =
          token.onboardingCompleted as boolean;
        session.user.isDemo = (token.isDemo as boolean) || false;
        session.user.strategyMode = (token.strategyMode as string) || "referral_first";
        session.user.isAdmin = (token.isAdmin as boolean) || false;
      }
      return session;
    },
  },
};
