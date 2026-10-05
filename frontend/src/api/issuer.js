import api from "./axios";

export const uploadBatch = (formData) =>
  api.post("/issuer/batches/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);

export const listBatches = (params = {}) =>
  api.get("/issuer/batches", { params }).then(r => r.data);

export const getBatchDetail = (batchId) =>
  api.get(`/issuer/batches/${batchId}`).then(r => r.data);


export const deleteOwnBatch = (batchId) =>
  api.delete(`/issuer/batches/${batchId}`).then(r => r.data);

export const searchCertificates = (search, params) =>
  api.post("/issuer/certificates/search", search, { params }).then(r => r.data);

export const getCertificateStatus = (certId) =>
  api.get(`/issuer/certificates/${certId}/status`).then(r => r.data);

export const getAllCertificates = (params) =>
  api.get("/issuer/certificates", { params }).then(r => r.data);

export const changeCertificateStatus = (certId, data) =>
  api.patch(`/issuer/certificates/${certId}/status`, data).then(r => r.data);

export const getBatchWithCertificates = (batchId) =>
  api.get(`/issuer/batches/${batchId}/certificates`).then(r => r.data);


export const getAuditHistory = (params) =>
  api.get("/issuer/audit-history", { params }).then(r => r.data);

export const getExtendedStats = () =>
  api.get("/issuer/stats/extended").then(r => r.data);