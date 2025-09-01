// src/auth.js

// --- Token ---
export function setToken(token) {
  localStorage.setItem("accessToken", token);
}

export function getToken() {
  return localStorage.getItem("accessToken");
}

// --- Refresh Token ---
export function setRefreshToken(token) {
  localStorage.setItem("refreshToken", token);
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

// --- User Info ---
export function setUserInfo({ name, role, userId }) {
  localStorage.setItem("userName", name);
  localStorage.setItem("userRole", role);
  localStorage.setItem("userId", userId);
}

export function getUserInfo() {
  return {
    name: localStorage.getItem("userName"),
    role: localStorage.getItem("userRole"),
    userId: localStorage.getItem("userId"),
  };
}

// --- Logout ---
export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userId");
}
