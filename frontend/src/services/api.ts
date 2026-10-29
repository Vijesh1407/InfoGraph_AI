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

export async function getSystemConfig() {
  const { data } = await api.get('/infographics/config');
  return data;
}

export async function regenerateImage(
  prompt: string,
  category: string,
  theme: string = 'default',
) {
  const { data } = await api.post('/infographics/regenerate-image', {
    prompt,
    category,
    theme,
  });
  return data;
}

export function getFullImageUrl(urlOrPath: string): string {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://') || urlOrPath.startsWith('data:')) {
    return urlOrPath;
  }
  // Remove /api/v1 prefix if BASE already contains it
  const baseRoot = BASE.replace(/\/api\/v1\/?$/, '');
  return `${baseRoot}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
}
