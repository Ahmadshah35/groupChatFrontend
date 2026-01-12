import axios from "axios";

const API = axios.create({
  baseURL: "https://chat.apiforapp.link/api",
  // baseURL: "http://localhost:2000/api",
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`; // ✅ correct
  }
  return req;
});

export default API;
