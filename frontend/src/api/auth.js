import api from "./axios";

export const login = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

export const changePassword = (newPassword) =>
  api.post("/auth/change-password", { new_password: newPassword }).then(r => r.data);

export const getMe = () =>
  api.get("/auth/me").then(r => r.data);