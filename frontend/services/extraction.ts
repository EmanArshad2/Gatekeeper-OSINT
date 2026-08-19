import { api } from "./api";
export async function extractMedia(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("extract-media", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}
