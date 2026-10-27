import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

export function getApiError(error) {
  return error.response?.data?.message ?? "The service could not be reached. Please try again.";
}

export default api;
