import api from "./axios";

export const requestAccess = (data) =>
  api.post("/contact/request-access", data).then(r => r.data);