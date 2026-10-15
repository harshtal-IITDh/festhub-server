# Harshtal Backend Middleware Guide: Authorization & Role Checks

This guide documents how to use the authentication and authorization middlewares (`isLoggedIn` and `isAdmin`) in the Harshtal backend. All junior developers should follow these conventions when implementing new routes.

---

## 1. Architectural Rules

To maintain a clean and maintainable codebase, strictly follow the MVC separation:
1. **Route files (`src/routes/*.routes.js`)**: ONLY route paths, HTTP methods, and middleware chains. **NO business logic** or inline `(req, res)` handlers.
2. **Controller files (`src/controllers/*.controller.js`)**: The actual business logic and database interactions.
3. **Mounting (`src/app.js`)**: Mount routers using `app.use("/api/...", router)`. Do not write route logic directly in `app.js`.

---

## 2. Middlewares Overview

### `isLoggedIn` (`src/middleware/isLoggedIn.js`)
* **Purpose**: Verifies that the request comes from an authenticated user.
* **Pre-condition**: Assumes the authentication layer (Google OAuth / JWT / Session) has validated credentials and populated `req.user`.
* **Behavior**:
  * If `req.user` is missing or empty $\rightarrow$ Blocks request with **`401 Unauthorized`**.
  * If `req.user.isDeleted` is `true` $\rightarrow$ Blocks request with **`403 Forbidden`** (soft-delete policy).
  * If valid $\rightarrow$ Calls `next()`.

### `isAdmin` (`src/middleware/isAdmin.js`)
* **Purpose**: Verifies that the logged-in user has admin privileges.
* **Behavior**:
  * If user is not logged in (`!req.user`) $\rightarrow$ Returns **`401 Unauthorized`**.
  * If user's global role is not `"admin"` (e.g. regular `"user"`) $\rightarrow$ Blocks request with **`403 Forbidden`**.
  * **Event / Competition Scoping**:
    * If the route targets an event/competition (e.g. `/events/:eventId/...`, `/competitions/:competitionId/...`), `isAdmin` automatically checks whether the user is an assigned admin for that specific event.
    * Both **`LEAD`** and **`CO_LEAD`** roles have the exact same authority over their event.
    * **Cross-Event Isolation**: An admin of Competition A **cannot** access or manage Competition B. Any attempt is blocked with **`403 Forbidden`**.
    * If authorized, attaches `req.eventMember` to the request object and calls `next()`.

---

## 3. How to Use Middlewares in a Route File

### Example 1: Route for Any Logged-in User
Use `isLoggedIn` before the controller handler:

```javascript
// src/routes/user.routes.js
import { Router } from "express";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { getProfile, updateProfile } from "../controllers/user.controller.js";

const router = Router();

// Only logged-in users can view or update their profile
router.get("/profile", isLoggedIn, getProfile);
router.put("/profile", isLoggedIn, updateProfile);

export default router;
```

---

### Example 2: General Admin-Only Route (Global Admin)
Use both `isLoggedIn` and `isAdmin`:

```javascript
// src/routes/admin.routes.js
import { Router } from "express";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { isAdmin } from "../middleware/isAdmin.js";
import { getSystemMetrics, listAllUsers } from "../controllers/admin.controller.js";

const router = Router();

// General admin dashboard routes (not tied to a single competition)
router.get("/metrics", isLoggedIn, isAdmin, getSystemMetrics);
router.get("/users", isLoggedIn, isAdmin, listAllUsers);

export default router;
```

---

### Example 3: Competition / Event-Scoped Admin Route
When a route contains `:eventId`, `:competitionId`, `:event_id`, or `:competition_id`, `isAdmin` automatically resolves the event ID and checks `EventMember`:

```javascript
// src/routes/competition.routes.js
import { Router } from "express";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  createRound,
  advanceParticipants,
  updateCompetitionRules,
} from "../controllers/competition.controller.js";

const router = Router();

// Lead or Co-Lead of this specific event can manage rounds
// An admin of Event 1 attempting to access Event 2 will be blocked with 403 Forbidden!
router.post("/:eventId/rounds", isLoggedIn, isAdmin, createRound);
router.post("/:eventId/advance", isLoggedIn, isAdmin, advanceParticipants);
router.put("/:eventId/rules", isLoggedIn, isAdmin, updateCompetitionRules);

export default router;
```

---

### Example 4: Explicit Parameter Name (Factory Usage)
If your route parameter uses a non-standard name (e.g. `:id` or `:compCode`), invoke `isAdmin` as a factory with the parameter name:

```javascript
// Pass the param name explicitly to isAdmin("id"):
router.post("/competitions/:id/rounds", isLoggedIn, isAdmin("id"), createRound);
```

---

## 4. HTTP Status Code Reference

| Scenario | HTTP Status | Response Message |
| :--- | :--- | :--- |
| Anonymous request on protected route | **401 Unauthorized** | `"Unauthorized: You must be logged in to access this resource"` |
| Logged-in user (`role: "user"`) on admin route | **403 Forbidden** | `"Forbidden: Admin access required"` |
| Admin of Event A tries to access Event B | **403 Forbidden** | `"Forbidden: You do not have admin permissions (Lead or Co-Lead) for this event/competition"` |
| Soft-deleted user account | **403 Forbidden** | `"Forbidden: Account is deactivated"` |
| Valid authenticated user / authorized admin | **200 / 201 OK** | Passes to controller `next()` |

---

## 5. Schema Design & Verification Architecture

### User Schema (`src/models/User.js`)
* `userId`: Unique identifier for the user (with `user_id` alias). Used for cross-verification.
* `role`: `"user" | "admin"`.

### Competition Schema (`src/models/Competition.js`)
* `admins`: Array storing the IDs of the two admin users in charge of this competition (Lead and Co-Lead IDs).
  ```javascript
  admins: {
    type: [{ type: mongoose.Schema.Types.Mixed, ref: "User" }],
    default: [],
    alias: "adminUsers",
  }
  ```

### Cross-Verification & Scope Enforcement
1. When a route is scoped to an event (e.g. `/:eventId/...`), `isAdmin` checks if the logged-in user's `userId`, `_id`, or `id` is present in `competition.admins`.
2. Both admins in `competition.admins` (Lead & Co-Lead) have the exact same authority and access.
3. If an admin in charge of Event B attempts to perform actions on Event A, their ID will not be in Event A's `admins`, blocking the request with **`403 Forbidden`**.
