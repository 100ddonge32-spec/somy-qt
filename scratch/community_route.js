"use strict";
(() => {
  var e = {};
  ((e.id = 860),
    (e.ids = [860]),
    (e.modules = {
      517: (e) => {
        e.exports = require("next/dist/compiled/next-server/app-route.runtime.prod.js");
      },
      9491: (e) => {
        e.exports = require("assert");
      },
      4300: (e) => {
        e.exports = require("buffer");
      },
      6113: (e) => {
        e.exports = require("crypto");
      },
      3685: (e) => {
        e.exports = require("http");
      },
      5687: (e) => {
        e.exports = require("https");
      },
      1808: (e) => {
        e.exports = require("net");
      },
      2037: (e) => {
        e.exports = require("os");
      },
      2781: (e) => {
        e.exports = require("stream");
      },
      4404: (e) => {
        e.exports = require("tls");
      },
      6224: (e) => {
        e.exports = require("tty");
      },
      7310: (e) => {
        e.exports = require("url");
      },
      3837: (e) => {
        e.exports = require("util");
      },
      6630: (e, t, r) => {
        (r.r(t),
          r.d(t, {
            headerHooks: () => w,
            originalPathname: () => j,
            patchFetch: () => v,
            requestAsyncStorage: () => E,
            routeModule: () => _,
            serverHooks: () => q,
            staticGenerationAsyncStorage: () => g,
            staticGenerationBailout: () => x,
          }));
        var s = {};
        (r.r(s),
          r.d(s, {
            DELETE: () => h,
            GET: () => d,
            PATCH: () => y,
            POST: () => f,
            dynamic: () => p,
          }));
        var o = r(5419),
          i = r(9108),
          a = r(9678),
          n = r(8070),
          u = r(3950),
          c = r(3966),
          l = r(6599);
        let p = "force-dynamic",
          m = (0, u.eI)(
            "https://lfjrfyylsxhvwosdpujv.supabase.co",
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: !1, persistSession: !1 } },
          );
        async function d(e) {
          try {
            let { searchParams: t } = new URL(e.url),
              r = t.get("church_id") || "jesus-in",
              s = parseInt(t.get("page") || "1"),
              o = parseInt(t.get("limit") || "5"),
              i = (s - 1) * o,
              { data: a, error: u } = await m
                .from("community_posts")
                .select(
                  `
                *,
                comments:community_comments(*)
            `,
                )
                .eq("church_id", r)
                .order("created_at", { ascending: !1 })
                .range(i, i + o - 1);
            if (u) throw u;
            return n.Z.json(a);
          } catch (e) {
            return n.Z.json({ error: e.message }, { status: 500 });
          }
        }
        async function f(e) {
          try {
            let {
                user_id: t,
                user_name: r,
                avatar_url: s,
                content: o,
                church_id: i,
                is_private: a,
                is_qt: u,
              } = await e.json(),
              p = i || "jesus-in",
              { data: d, error: f } = await m
                .from("community_posts")
                .insert([
                  {
                    user_id: t,
                    user_name: r,
                    avatar_url: s,
                    content: o,
                    church_id: p,
                    is_private: a ?? !1,
                    is_qt: u ?? !1,
                  },
                ])
                .select()
                .single();
            if (f) throw f;
            if (((0, c.a)(t, r, "POST_CREATED", p, o.slice(0, 50)), u)) {
              let e = new Date(Date.now() + 324e5).toISOString().split("T")[0];
              (await m
                .from("qt_completions")
                .upsert(
                  {
                    user_id: t,
                    user_name: r || "성도",
                    completed_date: e,
                    answers: [o],
                  },
                  { onConflict: "user_id,completed_date" },
                ),
                (0, c.a)(t, r, "QT_COMPLETED", p, e));
            }
            if (!a) {
              let { data: e } = await m
                .from("profiles")
                .select("id")
                .eq("church_id", p)
                .neq("id", t);
              if (e && e.length > 0) {
                let t = e.map((e) => e.id),
                  { data: s } = await m
                    .from("push_subscriptions")
                    .select("user_id, subscription")
                    .in("user_id", t);
                if (s && s.length > 0) {
                  let e = s.map((e) => {
                    let t = JSON.stringify({
                      title: `✨ 새로운 은혜나눔`,
                      body: `${r}님이 새로운 글을 올리셨습니다.`,
                      url: "/",
                      userId: e.user_id,
                    });
                    return l.Z.sendNotification(e.subscription, t).catch(
                      (e) => {},
                    );
                  });
                  await Promise.allSettled(e);
                }
                let o = t.map((e) => ({
                  user_id: e,
                  type: "community_post",
                  actor_name: r,
                  post_id: d.id,
                  is_read: !1,
                }));
                await m.from("notifications").insert(o);
              }
            }
            return n.Z.json(d);
          } catch (e) {
            return n.Z.json({ error: e.message }, { status: 500 });
          }
        }
        async function h(e) {
          try {
            let { id: t } = await e.json();
            if (!t)
              return n.Z.json({ error: "ID is required" }, { status: 400 });
            console.log(`[DELETE] 게시글 삭제 시작. id=${t}`);
            let { error: r } = await m
              .from("community_comments")
              .delete()
              .eq("post_id", t);
            r &&
              console.error(
                "[DELETE] 댓글 삭제 중 오류 (무시하고 계속):",
                r.message,
              );
            let { error: s } = await m
              .from("community_posts")
              .delete()
              .eq("id", t);
            if (s) throw (console.error("[DELETE] 게시글 삭제 실패:", s), s);
            return (
              console.log(`[DELETE] 게시글 삭제 완료.`),
              n.Z.json({ success: !0 })
            );
          } catch (e) {
            return (
              console.error("[DELETE] 최종 에러:", e),
              n.Z.json({ error: e.message, code: e.code }, { status: 500 })
            );
          }
        }
        async function y(e) {
          try {
            let { id: t, content: r, is_private: s } = await e.json();
            if (!t || !r)
              return n.Z.json(
                { error: "ID and content are required" },
                { status: 400 },
              );
            let o = { content: r };
            void 0 !== s && (o.is_private = s);
            let { data: i, error: a } = await m
              .from("community_posts")
              .update(o)
              .eq("id", t)
              .select()
              .single();
            if (a) throw a;
            return n.Z.json(i);
          } catch (e) {
            return n.Z.json({ error: e.message }, { status: 500 });
          }
        }
        let _ = new o.AppRouteRouteModule({
            definition: {
              kind: i.x.APP_ROUTE,
              page: "/api/community/route",
              pathname: "/api/community",
              filename: "route",
              bundlePath: "app/api/community/route",
            },
            resolvedPagePath:
              "/Users/macbook/어플 개발 테스트/somy-qt/src/app/api/community/route.ts",
            nextConfigOutput: "export",
            userland: s,
          }),
          {
            requestAsyncStorage: E,
            staticGenerationAsyncStorage: g,
            serverHooks: q,
            headerHooks: w,
            staticGenerationBailout: x,
          } = _,
          j = "/api/community/route";
        function v() {
          return (0, a.patchFetch)({
            serverHooks: q,
            staticGenerationAsyncStorage: g,
          });
        }
      },
      3966: (e, t, r) => {
        r.d(t, { a: () => o });
        let s = (0, r(3950).eI)(
          "https://lfjrfyylsxhvwosdpujv.supabase.co",
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: !1, persistSession: !1 } },
        );
        async function o(e, t, r, o, i) {
          try {
            let { error: a } = await s
              .from("activity_logs")
              .insert([
                {
                  user_id: e,
                  user_name: t,
                  activity_type: r,
                  church_id: o,
                  details: i,
                  created_at: new Date().toISOString(),
                },
              ]);
            a && console.error("[Logger] Failed to log activity:", a.message);
          } catch (e) {
            console.error("[Logger] Critical error:", e);
          }
        }
      },
      6599: (e, t, r) => {
        r.d(t, { Z: () => i });
        var s = r(8911),
          o = r.n(s);
        !(function () {
          try {
            (console.log("[WebPush] Initializing VAPID (Fixed Pair)..."),
              o().setVapidDetails(
                "mailto:admin@somy-qt.vercel.app",
                "BCb9VfYqqCOBO2MhVKC65TP2eAQw_bJoFRl4JgqU64ze2AImucB1H6GV1m78F7BuxPaGGRvETl1ACMdkVwTxIKQ",
                "bh-AhDK0mUyEyR-kQUiLrfdJYIp2SFDLAJUAjrUIS2Q",
              ));
          } catch (e) {
            return (console.error("[WebPush] Initialization Error:", e), !1);
          }
        })();
        let i = o();
      },
    }));
  var t = require("../../../webpack-runtime.js");
  t.C(e);
  var r = (e) => t((t.s = e)),
    s = t.X(0, [9431, 6206, 3950, 8911], () => r(6630));
  module.exports = s;
})();
