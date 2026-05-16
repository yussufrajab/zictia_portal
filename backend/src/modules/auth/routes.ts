import { Router } from "express";
import {
  registerIndividual,
  registerGovernment,
  login,
  refreshToken,
  logout,
  requestPasswordReset,
  resetPassword,
  changePassword,
  verifyMobileOtp,
  getMe,
  createSubUser,
  listSubUsers,
  removeSubUser,
} from "./controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.post("/register", registerIndividual);
router.post("/register/government", registerGovernment);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", requireAuth, logout);
router.post("/password-reset-request", requestPasswordReset);
router.post("/password-reset", resetPassword);
router.post("/change-password", requireAuth, changePassword);
router.post("/verify-otp", verifyMobileOtp);
router.get("/me", requireAuth, getMe);

router.post("/sub-users", requireAuth, createSubUser);
router.get("/sub-users", requireAuth, listSubUsers);
router.delete("/sub-users/:userId", requireAuth, removeSubUser);

export default router;
