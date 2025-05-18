// src/auth.js

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function getToken() {
  return localStorage.getItem("token");
}

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

export function logout() {
  localStorage.clear();
}
