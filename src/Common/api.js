import axios from "axios";

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://dev-siamida.unpak.ac.id/api/v2";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

// JWT decoder helper
const decodeJWT = (jwt) => {
  if (!jwt || typeof jwt !== "string") return null;
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
};

// Retrieve valid token from localStorage
export const getValidToken = () => {
  const clean = (t) => {
    if (!t || typeof t !== "string") return "";
    return t.startsWith("Bearer ") ? t.slice(7).trim() : t.trim();
  };
  const now = Math.floor(Date.now() / 1000);

  const rawToken = clean(localStorage.getItem("token"));
  if (rawToken) {
    const payload = decodeJWT(rawToken);
    if (!payload?.exp || payload.exp > now) return rawToken;
  }

  const rawRefresh = clean(localStorage.getItem("refresh"));
  if (rawRefresh) {
    const payload = decodeJWT(rawRefresh);
    if (!payload?.exp || payload.exp > now) return rawRefresh;
  }

  if (rawToken && rawToken.split(".").length === 3) return rawToken;
  return null;
};

// Create configured Axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor: attach Authorization header automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = getValidToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeLevel = localStorage.getItem("activeLevel");
    if (activeLevel) {
      config.headers["X-Active-Role"] = activeLevel;
      config.headers["X-Level"] = activeLevel;
    }
    const posYear = localStorage.getItem("positionYear");
    if (posYear) {
      config.headers["X-Position-Year"] = posYear;
      config.headers["X-Tahun"] = posYear;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract clean error messages from backend responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Terjadi kesalahan pada sistem";
    let code = null;

    if (error.response) {
      const data = error.response.data;
      const status = error.response.status;
      const url = String(error.config?.url || "");
      const isHtml =
        typeof data === "string" &&
        (/<html/i.test(data) ||
          /<!doctype/i.test(data) ||
          /<body/i.test(data) ||
          /<title>404/i.test(data) ||
          data.trim().startsWith("<"));

      if (url.includes("/login") || url.endsWith("login")) {
        if (status === 404 && isHtml) {
          message = "username atau password tidak tepat";
        } else if (typeof data === "string") {
          message = isHtml ? "username atau password tidak tepat" : data;
        } else if (data && typeof data === "object") {
          message =
            data.message ||
            data.Message ||
            data.error ||
            data.Error ||
            "username atau password tidak tepat";
          code = data.code || data.Code;
        }
      } else if (typeof data === "string") {
        message = isHtml
          ? `HTTP ${status}: ${error.response.statusText || "Error"}`
          : data;
      } else if (data && typeof data === "object") {
        message =
          data.message ||
          data.Message ||
          data.error ||
          data.Error ||
          `HTTP ${error.response.status}: ${error.response.statusText}`;
        code = data.code || data.Code;
      } else {
        message = `HTTP ${error.response.status}: ${error.response.statusText}`;
      }
    } else if (error.request) {
      message =
        "Layanan server tidak dapat dihubungi. Periksa koneksi internet Anda.";
    } else {
      message = error.message || message;
    }

    const customError = new Error(message);
    customError.code = code;
    customError.status = error.response?.status;
    customError.data = error.response?.data;
    customError.response = error.response;
    customError.originalError = error;

    return Promise.reject(customError);
  }
);

// High-level API wrapper
export const api = {
  get: async (url, config = {}) => {
    const res = await apiClient.get(url, config);
    return res.data;
  },
  post: async (url, data, config = {}) => {
    const res = await apiClient.post(url, data, config);
    return res.data;
  },
  put: async (url, data, config = {}) => {
    const res = await apiClient.put(url, data, config);
    return res.data;
  },
  patch: async (url, data, config = {}) => {
    const res = await apiClient.patch(url, data, config);
    return res.data;
  },
  delete: async (url, config = {}) => {
    const res = await apiClient.delete(url, config);
    return res.data;
  },
  // Robust file downloader for PDF/blobs
  download: async (url, defaultFilename = "download.pdf", config = {}) => {
    const response = await apiClient.get(url, {
      ...config,
      responseType: "blob",
    });

    let filename = defaultFilename;
    const disposition = response.headers?.["content-disposition"];
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "").trim();
      }
    }

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    return filename;
  },
  client: apiClient,
  BASE_URL: API_BASE_URL,
};

// Domain-specific endpoints for KTS
export const ktsApi = {
  getRenstraInfo: (uuidRenstra) => api.get(`/renstra/${uuidRenstra}`),
  getTemuan: (uuidRenstra) => api.get(`/kts/temuan/${uuidRenstra}`),
  generateKts: (formData) => api.post("/kts/generate", formData),
  publishKts: (uuid) => api.get(`/kts/publish/${uuid}`),
  exportPdf: (uuid, tahun, filename) =>
    api.download(`/kts/export/${uuid}?ctxtahun=${tahun}`, filename),
  updateWorkflow: (tahun, uuid, formData) =>
    api.put(`/kts/${tahun}/${uuid}`, formData),
};

export default api;
