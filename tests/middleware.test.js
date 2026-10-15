import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

import { isLoggedIn } from "../src/middleware/isLoggedIn.js";
import { isAdmin } from "../src/middleware/isAdmin.js";
import app from "../src/app.js";

// Helper to simulate Express middleware invocation
const runMiddleware = (middleware, req, res = null) => {
  return new Promise((resolve) => {
    let nextCalled = false;
    let responseStatus = null;
    let responseBody = null;

    const mockRes = res || {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseBody = data;
        resolve({ nextCalled: false, status: responseStatus, body: responseBody });
        return this;
      },
    };

    const next = (err) => {
      nextCalled = true;
      resolve({ nextCalled: true, err, status: responseStatus, body: responseBody });
    };

    middleware(req, mockRes, next);
  });
};

describe("1. isLoggedIn Middleware Unit Tests", () => {
  it("blocks anonymous (not logged in) request with 401", async () => {
    const req = {}; // no req.user
    const result = await runMiddleware(isLoggedIn, req);

    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 401);
    assert.match(result.body.message, /Unauthorized/i);
  });

  it("blocks request with empty user object with 401", async () => {
    const req = { user: {} };
    const result = await runMiddleware(isLoggedIn, req);

    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 401);
    assert.match(result.body.message, /Unauthorized/i);
  });

  it("blocks soft-deleted user account with 403", async () => {
    const req = {
      user: { id: "user-1", email: "deleted@gmail.com", role: "user", isDeleted: true },
    };
    const result = await runMiddleware(isLoggedIn, req);

    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
    assert.match(result.body.message, /deactivated/i);
  });

  it("allows valid logged-in user to proceed via next()", async () => {
    const req = {
      user: { id: "user-1", email: "active@gmail.com", role: "user", isDeleted: false },
    };
    const result = await runMiddleware(isLoggedIn, req);

    assert.equal(result.nextCalled, true);
  });
});

describe("2. isAdmin Middleware Unit Tests (Global Role)", () => {
  it("blocks unauthenticated user with 401", async () => {
    const req = {};
    const result = await runMiddleware(isAdmin, req);

    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 401);
    assert.match(result.body.message, /Unauthorized/i);
  });

  it("blocks normal 'user' role with 403", async () => {
    const req = {
      user: { id: "user-regular", role: "user" },
    };
    const result = await runMiddleware(isAdmin, req);

    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
    assert.match(result.body.message, /Forbidden.*Admin/i);
  });

  it("allows global admin on non-event route via next()", async () => {
    const req = {
      user: { id: "admin-1", role: "admin" },
      params: {},
    };
    const result = await runMiddleware(isAdmin, req);

    assert.equal(result.nextCalled, true);
  });
});

describe("3. isAdmin Middleware Unit Tests (Event Scoping & Isolation)", () => {
  it("allows Event LEAD admin on Event A route", async () => {
    const req = {
      user: {
        id: "lead-user-1",
        role: "admin",
        eventMembers: [{ event_id: "event-a", role: "LEAD" }],
      },
      params: { eventId: "event-a" },
    };
    const result = await runMiddleware(isAdmin, req);

    assert.equal(result.nextCalled, true);
    assert.equal(req.eventMember.role, "LEAD");
  });

  it("allows Event CO_LEAD admin on Event A route (same power scope as LEAD)", async () => {
    const req = {
      user: {
        id: "colead-user-1",
        role: "admin",
        eventMembers: [{ event_id: "event-a", role: "CO_LEAD" }],
      },
      params: { eventId: "event-a" },
    };
    const result = await runMiddleware(isAdmin, req);

    assert.equal(result.nextCalled, true);
    assert.equal(req.eventMember.role, "CO_LEAD");
  });

  it("blocks Event A admin from accessing Event B (prevents cross-event interference)", async () => {
    const req = {
      user: {
        id: "admin-event-a",
        role: "admin",
        eventMembers: [{ event_id: "event-a", role: "LEAD" }],
      },
      params: { eventId: "event-b" }, // Targeting Event B
    };
    const result = await runMiddleware(isAdmin, req);

    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
    assert.match(result.body.message, /not have admin permissions/i);
  });

  it("blocks regular user from accessing Event A route with 403", async () => {
    const req = {
      user: {
        id: "regular-user",
        role: "user",
      },
      params: { eventId: "event-a" },
    };
    const result = await runMiddleware(isAdmin, req);

    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
  });

  it("works with factory configuration isAdmin('customId')", async () => {
    const customAdminMiddleware = isAdmin("customId");

    const authorizedReq = {
      user: {
        id: "admin-lead",
        role: "admin",
        eventMembers: [{ event_id: "comp-99", role: "LEAD" }],
      },
      params: { customId: "comp-99" },
    };
    const resAuth = await runMiddleware(customAdminMiddleware, authorizedReq);
    assert.equal(resAuth.nextCalled, true);

    const unauthorizedReq = {
      user: {
        id: "admin-lead",
        role: "admin",
        eventMembers: [{ event_id: "comp-99", role: "LEAD" }],
      },
      params: { customId: "comp-100" },
    };
    const resUnauth = await runMiddleware(customAdminMiddleware, unauthorizedReq);
    assert.equal(resUnauth.nextCalled, false);
    assert.equal(resUnauth.status, 403);
  });

  it("allows admin in charge when verified via competition.admins array (Lead admin)", async () => {
    const req = {
      user: {
        userId: "USR_LEAD_100",
        role: "admin",
      },
      competition: {
        name: "Solo Singing",
        admins: ["USR_LEAD_100", "USR_COLEAD_101"], // the two admin users in charge
      },
      params: { eventId: "solo-singing" },
    };
    const result = await runMiddleware(isAdmin, req);
    assert.equal(result.nextCalled, true);
  });

  it("allows admin in charge when verified via competition.admins array (Co-Lead admin)", async () => {
    const req = {
      user: {
        userId: "USR_COLEAD_101",
        role: "admin",
      },
      competition: {
        name: "Solo Singing",
        admins: ["USR_LEAD_100", "USR_COLEAD_101"], // the two admin users in charge
      },
      params: { eventId: "solo-singing" },
    };
    const result = await runMiddleware(isAdmin, req);
    assert.equal(result.nextCalled, true);
  });

  it("blocks Event B admin from accessing Event A when cross-verified against competition.admins", async () => {
    const req = {
      user: {
        userId: "USR_EVENT_B_ADMIN", // Admin of Event B
        role: "admin",
      },
      competition: {
        name: "Event A",
        admins: ["USR_LEAD_A", "USR_COLEAD_A"], // Only Event A admins listed
      },
      params: { eventId: "event-a" },
    };
    const result = await runMiddleware(isAdmin, req);
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
    assert.match(result.body.message, /not have admin permissions/i);
  });
});

describe("4. End-to-End Route Integration Tests on /api/auth", () => {
  let server;
  let baseUrl;

  // Simple HTTP fetch helper for native Node.js
  const fetchUrl = (path, headers = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(
        url,
        {
          method: "GET",
          headers,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            resolve({
              statusCode: res.statusCode,
              body: data ? JSON.parse(data) : null,
            });
          });
        }
      );
      req.on("error", reject);
      req.end();
    });
  };

  it("full route test: unauthenticated, user role, and admin role on app", async () => {
    // We create a test harness that integrates the actual app routes
    const testApp = express();
    testApp.use(express.json());

    // Middleware to simulate auth header in tests: x-test-user JSON
    testApp.use((req, res, next) => {
      if (req.headers["x-test-user"]) {
        req.user = JSON.parse(req.headers["x-test-user"]);
      }
      next();
    });

    // Mount the real app router
    testApp.use(app);

    server = testApp.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. Anonymous request to /api/auth/me -> 401
      const res1 = await fetchUrl("/api/auth/me");
      assert.equal(res1.statusCode, 401);
      assert.match(res1.body.message, /Unauthorized/i);

      // 2. Authenticated user request to /api/auth/me -> 200
      const res2 = await fetchUrl("/api/auth/me", {
        "x-test-user": JSON.stringify({ id: "user-1", role: "user", name: "Alice" }),
      });
      assert.equal(res2.statusCode, 200);
      assert.equal(res2.body.user.name, "Alice");

      // 3. Anonymous request to /api/auth/admin/test -> 401
      const res3 = await fetchUrl("/api/auth/admin/test");
      assert.equal(res3.statusCode, 401);

      // 4. Regular user on /api/auth/admin/test -> 403
      const res4 = await fetchUrl("/api/auth/admin/test", {
        "x-test-user": JSON.stringify({ id: "user-1", role: "user" }),
      });
      assert.equal(res4.statusCode, 403);
      assert.match(res4.body.message, /Forbidden.*Admin/i);

      // 5. Admin user on /api/auth/admin/test -> 200
      const res5 = await fetchUrl("/api/auth/admin/test", {
        "x-test-user": JSON.stringify({ id: "admin-1", role: "admin", name: "Admin Bob" }),
      });
      assert.equal(res5.statusCode, 200);
      assert.equal(res5.body.success, true);

      // 6. Admin of Event A (LEAD) accessing Event A -> 200
      const res6 = await fetchUrl("/api/auth/events/event-A/admin/test", {
        "x-test-user": JSON.stringify({
          id: "admin-lead-a",
          role: "admin",
          eventMembers: [{ event_id: "event-A", role: "LEAD" }],
        }),
      });
      assert.equal(res6.statusCode, 200);
      assert.equal(res6.body.eventMember.role, "LEAD");

      // 7. Admin of Event A (CO_LEAD) accessing Event A -> 200
      const res7 = await fetchUrl("/api/auth/events/event-A/admin/test", {
        "x-test-user": JSON.stringify({
          id: "admin-colead-a",
          role: "admin",
          eventMembers: [{ event_id: "event-A", role: "CO_LEAD" }],
        }),
      });
      assert.equal(res7.statusCode, 200);
      assert.equal(res7.body.eventMember.role, "CO_LEAD");

      // 8. Admin of Event A trying to access Event B -> 403
      const res8 = await fetchUrl("/api/auth/events/event-B/admin/test", {
        "x-test-user": JSON.stringify({
          id: "admin-lead-a",
          role: "admin",
          eventMembers: [{ event_id: "event-A", role: "LEAD" }],
        }),
      });
      assert.equal(res8.statusCode, 403);
      assert.match(res8.body.message, /not have admin permissions/i);
    } finally {
      server.close();
    }
  });
});
