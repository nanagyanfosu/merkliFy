import api from "./axios";

export const getDashboardSummary = () =>
  api.get("/admin/dashboard-summary").then(r => r.data);

export const getIssuerDetail = (userId) =>
  api.get(`/admin/issuers/${userId}`).then(r => r.data);

export const getAllCertificates = (params) =>
  api.post("/admin/certificates/search", {}, { params }).then(r => r.data);

// Universities
export const listUniversities = () =>
  api.get("/admin/universities").then(r => r.data);

export const registerUniversity = (data) =>
  api.post("/admin/universities", data).then(r => r.data);

export const updateTrustStatus = (universityId, status) =>
  api.patch(`/admin/universities/${universityId}/trust?status=${status}`).then(r => r.data);

// Issuers
export const createIssuer = (email, universityId, issuerName, department = "") =>
  api.post("/admin/issuers", {
    email,
    university_id: universityId,
    issuer_name: issuerName,
    department,
  }).then(r => r.data);

export const resetIssuerPassword = (userId) =>
  api.post(`/admin/issuers/${userId}/reset-password`).then(r => r.data);

// Verification logs
export const getVerificationLogs = (params) =>
  api.get("/admin/verification-logs", { params }).then(r => r.data);

// Certificates
export const adminSearchCertificates = (search, params) =>
  api.post("/admin/certificates/search", search, { params }).then(r => r.data);

export const adminGetCertificateStatus = (certId) =>
  api.get(`/admin/certificates/${certId}/status`).then(r => r.data);

export const adminChangeCertificateStatus = (certId, data) =>
  api.patch(`/admin/certificates/${certId}/status`, data).then(r => r.data);

export const adminGetAuditHistory = (universityId, params) =>
  api.get(`/admin/universities/${universityId}/audit-history`, { params }).then(r => r.data);

// Activity
export const getRecentActivity = () =>
  api.get("/admin/activity").then(r => r.data);