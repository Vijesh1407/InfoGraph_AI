import React, { useState } from 'react';
import {
  Sparkles, Download, Layers, Eye, Code,
  Copy, Check, AlertCircle, Key, RefreshCw, ZoomIn
} from 'lucide-react';
import type { GenerateResponse, ThemeConfig, InfographicData } from '../types/infographic';
import { getFullImageUrl } from '../services/api';
import { InfographicRenderer } from './InfographicRenderer';

interface Props {
  result: GenerateResponse;
  theme: ThemeConfig;
  onRegenerateImage?: () => void;
  regenerating?: boolean;
  exportRef: React.RefObject<HTMLDivElement | null>;
}

type ViewMode = 'ai-image' | 'hybrid' | 'structured';

export const InfographicImageDisplay: React.FC<Props> = ({
  result,
  theme,
  onRegenerateImage,
  regenerating = false,
  exportRef,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(
    result.image_url || result.image_b64 ? 'ai-image' : 'structured'
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const imageUrl = result.image_b64 || (result.image_url ? getFullImageUrl(result.image_url) : '');
  const hasImage = Boolean(imageUrl);
  const data = result.data;

  const handleCopyPrompt = () => {
    if (!result.image_prompt) return;
    navigator.clipboard.writeText(result.image_prompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  const handleDownloadDirectImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `infograph-flux-${data?.type || 'visual'}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── View Mode Switcher & Model Badge ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-800/80 border border-white/10 rounded-2xl p-2.5 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Active Model Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-500/20 to-accent-500/20 border border-brand-500/30 text-xs text-brand-300 font-medium">
            <Sparkles size={14} className="text-brand-400" />
            <span>FLUX.1-schnell</span>
            <span className="text-[10px] text-brand-300/80 font-mono px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-400/20">
              Cloudflare Workers AI
            </span>
          </div>

          {(result.image_status === 'missing_credentials' || result.image_status === 'missing_token') && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
              <Key size={12} />
              <span>Cloudflare Setup Required</span>
            </span>
          )}

          {result.image_status === 'auth_error' && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5 font-medium">
              <AlertCircle size={12} />
              <span>Cloudflare Auth Error</span>
            </span>
          )}

          {result.image_status === 'rate_limited' && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 font-medium">
              <AlertCircle size={12} />
              <span>Daily Neurons Quota (429)</span>
            </span>
          )}

          {result.image_status === 'generated' && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Genuine AI Synthesis</span>
            </span>
          )}
        </div>

        {/* View Mode Toggle Tabs */}
        <div className="flex items-center gap-1 bg-surface-700/60 p-1 rounded-xl border border-white/5 text-xs">
          {hasImage && (
            <>
              <button
                onClick={() => setViewMode('ai-image')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === 'ai-image'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Eye size={13} />
                <span>AI Generated Image</span>
              </button>

              <button
                onClick={() => setViewMode('hybrid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === 'hybrid'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="AI visual illustration with verified sharp text overlay"
              >
                <Layers size={13} />
                <span>Hybrid Overlay</span>
              </button>
            </>
          )}

          <button
            onClick={() => setViewMode('structured')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === 'structured'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code size={13} />
            <span>Structured Preview</span>
          </button>
        </div>

        {/* Secondary Actions (Prompt inspect & quick download) */}
        <div className="flex items-center gap-2">
          {result.image_prompt && (
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                showPrompt
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                  : 'text-white/60 hover:text-white bg-white/5 border-white/5'
              }`}
              title="Inspect category-aware prompt sent to FLUX.1"
            >
              <Code size={13} />
              <span>Prompt</span>
            </button>
          )}

          {hasImage && onRegenerateImage && (
            <button
              onClick={onRegenerateImage}
              disabled={regenerating}
              className="p-1.5 rounded-lg text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer disabled:opacity-50"
              title="Regenerate Image with FLUX.1 (Cloudflare Workers AI)"
            >
              <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* ── Missing Cloudflare Credentials Notice Banner ────────────────── */}
      {(result.image_status === 'missing_credentials' || result.image_status === 'missing_token') && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Key size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-200">
                Cloudflare Workers AI (FLUX.1-schnell) Credentials Required
              </p>
              <p className="text-amber-200/70 mt-0.5 leading-relaxed">
                The category-aware prompt and structured layout are ready. Cloudflare Workers AI offers a recurring free daily allowance (10,000 Neurons/day).
                To synthesize live images, configure your credentials in <code className="px-1.5 py-0.5 rounded bg-black/30 border border-white/10 text-white font-mono">backend/.env</code>:
              </p>
              <div className="mt-1.5 p-2 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-amber-100/90 space-y-0.5">
                <div>CLOUDFLARE_ACCOUNT_ID=your_account_id</div>
                <div>CLOUDFLARE_API_TOKEN=your_cloudflare_api_token</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs whitespace-nowrap transition-colors flex-shrink-0"
            >
              Cloudflare Dashboard →
            </a>
            {onRegenerateImage && (
              <button
                onClick={onRegenerateImage}
                disabled={regenerating}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Cloudflare Auth Error Notice Banner ──────────────────────────── */}
      {result.image_status === 'auth_error' && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle size={16} className="text-rose-400" />
            </div>
            <div>
              <p className="font-semibold text-rose-200">
                Cloudflare API Token Authentication Failed (HTTP 401/403)
              </p>
              <p className="text-rose-200/70 mt-0.5 leading-relaxed">
                Please verify that <code className="px-1.5 py-0.5 rounded bg-black/30 border border-white/10 text-white font-mono">CLOUDFLARE_API_TOKEN</code> in <code className="px-1.5 py-0.5 rounded bg-black/30 border border-white/10 text-white font-mono">backend/.env</code> is valid and has been granted the <span className="font-semibold text-white">"Workers AI: Read/Run"</span> permission in the Cloudflare Dashboard.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="https://dash.cloudflare.com/profile/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs whitespace-nowrap transition-colors"
            >
              API Tokens →
            </a>
            {onRegenerateImage && (
              <button
                onClick={onRegenerateImage}
                disabled={regenerating}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Cloudflare Daily Quota / Rate Limit Notice Banner (HTTP 429) ─── */}
      {result.image_status === 'rate_limited' && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-200">
                Cloudflare Free Daily Neurons Quota Limit (HTTP 429)
              </p>
              <p className="text-amber-200/70 mt-0.5 leading-relaxed">
                Cloudflare Workers AI free allowance (10,000 Neurons/day) or rate limit reached. The quota refreshes automatically every day at 00:00 UTC.
              </p>
            </div>
          </div>
          {onRegenerateImage && (
            <button
              onClick={onRegenerateImage}
              disabled={regenerating}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer flex-shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* ── Generic Provider Error Notice Banner ────────────────────────── */}
      {result.image_error &&
        result.image_status !== 'missing_credentials' &&
        result.image_status !== 'missing_token' &&
        result.image_status !== 'auth_error' &&
        result.image_status !== 'rate_limited' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <span>Image synthesis notice: {result.image_error}</span>
            </div>
            {onRegenerateImage && (
              <button
                onClick={onRegenerateImage}
                disabled={regenerating}
                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 font-medium border border-red-500/30 transition-colors flex-shrink-0 cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
      )}

      {/* ── Category-Aware Prompt Drawer ─────────────────────────────────── */}
      {showPrompt && result.image_prompt && (
        <div className="rounded-2xl border border-white/10 bg-surface-850/95 p-4 text-xs shadow-xl animate-fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-white/90 font-medium">
              <Code size={14} className="text-brand-400" />
              <span>Category-Aware Visual Prompt (Generated for FLUX.1-schnell)</span>
            </div>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              {promptCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{promptCopied ? 'Copied' : 'Copy Prompt'}</span>
            </button>
          </div>
          <p className="text-white/70 leading-relaxed font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto p-2 rounded-xl bg-black/40 border border-white/5">
            {result.image_prompt}
          </p>
        </div>
      )}

      {/* ── Main Display Area ────────────────────────────────────────────── */}
      <div className="flex justify-center w-full py-2">
        {/* VIEW 1: Raw AI Generated Image */}
        {viewMode === 'ai-image' && hasImage && (
          <div
            ref={exportRef}
            className="infographic-export-root relative flex flex-col items-center max-w-4xl w-full rounded-2xl overflow-hidden border border-white/10 bg-surface-850 shadow-2xl group transition-all"
          >
            <div className="relative w-full overflow-hidden flex items-center justify-center bg-black/40">
              <img
                src={imageUrl}
                alt={data?.title || 'Generated Infographic'}
                className={`w-full h-auto object-contain transition-transform duration-300 ${
                  zoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setZoomed(!zoomed)}
              />

              {/* Watermark/Verification Badge */}
              <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-[11px] text-white/80 flex items-center gap-2 pointer-events-none shadow-md">
                <Sparkles size={13} className="text-brand-400" />
                <span>FLUX.1-schnell · Category: <span className="capitalize font-semibold text-white">{data?.type?.replace('_', ' ')}</span></span>
              </div>

              {/* Quick Zoom Button */}
              <button
                onClick={() => setZoomed(!zoomed)}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
                title={zoomed ? 'Zoom Out' : 'Zoom In'}
              >
                <ZoomIn size={15} />
              </button>
            </div>

            {/* Sub-bar with title & direct download */}
            <div className="w-full px-5 py-3.5 bg-surface-800/90 border-t border-white/5 flex items-center justify-between text-xs">
              <div className="truncate mr-3">
                <span className="font-semibold text-white/90">{data?.title}</span>
                <span className="text-white/40 ml-2 hidden sm:inline">{data?.subtitle}</span>
              </div>
              <button
                onClick={handleDownloadDirectImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download size={13} />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: Hybrid Overlay View */}
        {viewMode === 'hybrid' && hasImage && data && (
          <div
            ref={exportRef}
            className="infographic-export-root relative flex flex-col items-center max-w-4xl w-full rounded-2xl overflow-hidden border border-white/10 bg-surface-850 shadow-2xl"
          >
            {/* Background AI Image with subtle darkening for maximum typography legibility */}
            <div className="relative w-full min-h-[480px] flex flex-col justify-between p-6 bg-cover bg-center overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(rgba(10, 15, 30, 0.72), rgba(10, 15, 30, 0.82)), url('${imageUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Header Card */}
              <div className="rounded-xl bg-black/60 backdrop-blur-md border border-white/15 p-4 mb-4 text-center max-w-2xl mx-auto shadow-lg">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/30 border border-brand-400/40 text-[10px] text-brand-300 font-semibold tracking-wider uppercase mb-1.5">
                  <Sparkles size={11} />
                  <span>Hybrid Generative Infographic</span>
                </div>
                <h2 className="text-xl font-display font-bold text-white tracking-tight drop-shadow-md">
                  {data.title}
                </h2>
                <p className="text-xs text-white/70 mt-1">
                  {data.subtitle}
                </p>
              </div>

              {/* Dynamic Overlay per Category */}
              {data.type === 'process' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-4">
                  {data.steps.map((step) => (
                    <div
                      key={step.step_number}
                      className="rounded-xl bg-black/55 backdrop-blur-md border border-white/15 p-3.5 shadow-md hover:border-brand-400/50 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-6 h-6 rounded-lg bg-brand-500/80 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                          {step.step_number}
                        </span>
                        <h4 className="font-semibold text-xs text-white tracking-wide truncate">
                          {step.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {data.type === 'timeline' && (
                <div className="flex flex-col gap-2.5 my-4 max-w-2xl mx-auto w-full">
                  {data.events.map((event, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-black/55 backdrop-blur-md border border-white/15 p-3 flex items-start gap-3 shadow-md"
                    >
                      {event.date && (
                        <span className="px-2.5 py-1 rounded-lg bg-brand-500/80 text-white font-mono font-bold text-xs whitespace-nowrap shadow-xs">
                          {event.date}
                        </span>
                      )}
                      <div>
                        <h4 className="font-semibold text-xs text-white">{event.label}</h4>
                        <p className="text-[11px] text-white/80 mt-0.5 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.type === 'comparison' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                  {data.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-black/60 backdrop-blur-md border border-white/15 p-4 shadow-md flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-400" />
                        <h3 className="font-bold text-sm text-white">{item.name}</h3>
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed">{item.description}</p>
                      <div className="mt-2 space-y-1.5">
                        {data.attributes.map((attr, aIdx) => (
                          <div key={aIdx} className="text-[10px] bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-white/40 block font-semibold uppercase">{attr.attribute}</span>
                            <span className="text-white/90">{attr.values[item.name] || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.type === 'concept_map' && (
                <div className="flex flex-col gap-3 my-4">
                  <div className="text-center mb-1">
                    <span className="px-3 py-1 rounded-xl bg-brand-500/40 border border-brand-400/50 text-xs font-bold text-white shadow-md">
                      Core Concept: {data.main_concept}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.subtopics.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-xl bg-black/55 backdrop-blur-md border border-white/15 p-3.5 shadow-md flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h4 className="font-semibold text-xs text-white truncate">{sub.name}</h4>
                            {sub.relationship_to_main && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-400/20 text-brand-300 border border-brand-400/30">
                                {sub.relationship_to_main}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/80 leading-relaxed">{sub.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Summary Card */}
              {data.summary && (
                <div className="rounded-xl bg-black/60 backdrop-blur-md border border-white/10 p-3 text-center max-w-xl mx-auto mt-2">
                  <p className="text-[11px] text-white/70 italic">"{data.summary}"</p>
                </div>
              )}
            </div>

            {/* Hybrid Download Action bar */}
            <div className="w-full px-5 py-3 bg-surface-800/90 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/50 text-[11px]">
                Hybrid view pairs AI background generation with verified readable typography.
              </span>
              <button
                onClick={handleDownloadDirectImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Download size={13} />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: Structured Vector Preview (Original Renderer) */}
        {viewMode === 'structured' && data && (
          <div
            ref={exportRef}
            className="infographic-export-root inline-block rounded-2xl shadow-2xl"
          >
            <InfographicRenderer data={data} theme={theme} />
          </div>
        )}
      </div>
    </div>
  );
};
