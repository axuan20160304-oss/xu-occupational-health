import type { NextAuthOptions, Account, Profile } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";
import CredentialsProvider from "next-auth/providers/credentials";

/* ---------- WeChat Open Platform OAuth ---------- */
interface WeChatProfile {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
}

function WeChatProvider(): OAuthConfig<WeChatProfile> {
  const appId = process.env.WECHAT_APP_ID ?? "";
  const appSecret = process.env.WECHAT_APP_SECRET ?? "";

  return {
    id: "wechat",
    name: "微信",
    type: "oauth",
    authorization: {
      url: "https://open.weixin.qq.com/connect/qrconnect",
      params: {
        appid: appId,
        response_type: "code",
        scope: "snsapi_login",
        state: Math.random().toString(36).slice(2),
      },
    },
    token: {
      url: "https://api.weixin.qq.com/sns/oauth2/access_token",
      async request({ params }) {
        const res = await fetch(
          `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${params.code}&grant_type=authorization_code`,
        );
        const data = await res.json();
        return {
          tokens: {
            access_token: data.access_token,
            token_type: "bearer",
            expires_in: data.expires_in,
            refresh_token: data.refresh_token,
            id_token: undefined,
          },
        };
      },
    },
    userinfo: {
      url: "https://api.weixin.qq.com/sns/userinfo",
      async request({ tokens }) {
        const res = await fetch(
          `https://api.weixin.qq.com/sns/userinfo?access_token=${tokens.access_token}&openid=${(tokens as Record<string, string>).openid ?? ""}&lang=zh_CN`,
        );
        return await res.json();
      },
    },
    profile(profile: WeChatProfile) {
      return {
        id: profile.openid,
        name: profile.nickname,
        image: profile.headimgurl,
        email: null,
      };
    },
    clientId: appId,
    clientSecret: appSecret,
  };
}

/* ---------- Admin OpenID whitelist ---------- */
const ADMIN_OPENIDS = (process.env.WECHAT_ADMIN_OPENIDS ?? "").split(",").filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.WECHAT_APP_ID ? [WeChatProvider()] : []),
    CredentialsProvider({
      name: "管理员登录",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const adminUser = process.env.ADMIN_USERNAME ?? "admin";
        const adminPass = process.env.ADMIN_PASSWORD ?? "xu2026admin";

        if (
          credentials?.username === adminUser &&
          credentials?.password === adminPass
        ) {
          return {
            id: "1",
            name: "徐广军",
            email: "admin@xu-health.com",
            role: "admin",
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        const userAny = user as unknown as Record<string, unknown>;
        if (userAny.role) {
          (token as Record<string, unknown>).role = userAny.role;
        } else if (account?.provider === "wechat") {
          (token as Record<string, unknown>).role = ADMIN_OPENIDS.includes(user.id) ? "admin" : "user";
          (token as Record<string, unknown>).openid = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET ?? "xu-health-secret-2026-default",
};
