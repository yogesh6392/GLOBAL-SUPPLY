import { demoApi } from "./demoApi";

export function getApiError(error) {
  return error.response?.data?.message ?? "The demonstration action could not be completed.";
}

export default demoApi;
