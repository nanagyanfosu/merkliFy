import api from "./axios";

export const login = async (email, password) =>
  api.post("/auth/login", { email, password }).then(r => r.data);

// First-time setup; no current password needed
export const setupPassword = (newPassword) =>
  api.post("/auth/setup-password", { new_password: newPassword }).then(r => r.data);

// Regular change from Settings — current password required
export const changePassword = (currentPassword, newPassword) =>
  api.post("/auth/change-password", {
    current_password: currentPassword,
    new_password:     newPassword,
  }).then(r => r.data);

// Verify current password without changing; used by two-step form
export const verifyPassword = (password) =>
  api.post("/auth/verify-password", { password }).then(r => r.data);

export const getMe = () =>
  api.get("/auth/me").then(r => r.data);