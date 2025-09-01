// src/api.js
import axios from "axios";
import { 
  getToken, 
  setToken, 
  getRefreshToken, 
  setRefreshToken, 
  logout 
} from "./auth";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// --- Intercepteur pour ajouter le token à chaque requête ---
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Intercepteur pour gérer les erreurs 401 ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        // ⚡ Endpoint de refresh token (à adapter selon ton backend)
        const res = await axios.post(`${API_BASE_URL}/refresh-token`, {
          token: refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = res.data;

        // ✅ Mise à jour des tokens
        setToken(accessToken);
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken);
        }

        // Relancer la requête initiale avec le nouveau token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("Refresh token failed:", err);
        logout();
        window.location.href = "/"; // Redirige direct login
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
