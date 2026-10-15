import { Router } from "express";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  getMe,
  testAdminAccess,
  testEventAdminAccess,
} from "../controllers/auth.controller.js";

const router = Router();

// Only URLs + middleware, NO business logic inside this route file

// 1. Logged-in user route: returns current authenticated user profile
router.get("/me", isLoggedIn, getMe);

// 2. Global Admin-only route: blocks non-admin users (403) and anonymous users (401)
router.get("/admin/test", isLoggedIn, isAdmin, testAdminAccess);

// 3. Event-scoped Admin route: checks LEAD / CO_LEAD for this specific event
router.get("/events/:eventId/admin/test", isLoggedIn, isAdmin, testEventAdminAccess);

export default router;
