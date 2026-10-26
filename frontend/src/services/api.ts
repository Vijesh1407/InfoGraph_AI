import axios from 'axios';
import type { GenerateResponse, ExtractPdfResponse, InfographicFormat } from '../types/infographic';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL: BASE });

export async function generateInfographic(
  text: string,
  format: InfographicFormat,
  theme: string,
): Promise<GenerateResponse> {
  const fd = new FormData();
  fd.append('text', text);
  fd.append('format', format);
  fd.append('theme', theme);
  const { data } = await api.post<GenerateResponse>('/infographics/generate', fd);
  return data;
}

export async function generateFromPdf(
  file: File,
  format: InfographicFormat,
  theme: string,
): Promise<GenerateResponse> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('format', format);
  fd.append('theme', theme);
  const { data } = await api.post<GenerateResponse>('/infographics/generate', fd);
  return data;
}

export async function extractPdf(file: File): Promise<ExtractPdfResponse> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post<ExtractPdfResponse>('/infographics/extract-pdf', fd);
  return data;
}

export async function checkHealth() {
  const { data } = await api.get('/health');
  return data;
}
