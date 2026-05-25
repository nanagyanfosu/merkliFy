import api from "./axios";

export const verifyCertificate = (data) =>
  api.post("/verify", data).then(r => r.data);

export const getInstitutions = () =>
  api.get("/verify/institutions").then(r => r.data);