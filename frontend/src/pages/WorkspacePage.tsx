import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Download, FileText, RefreshCw, Upload, X, AlertTriangle,
  Copy, Check, ChevronLeft, ChevronRight, Plus, Send,
  Cpu, Info
} from 'lucide-react';
import { toPng } from 'html-to-image';
import axios from 'axios';
import type {
  InfographicData, InfographicFormat, ThemeName, GenerateResponse, ThemeConfig,
} from '../types/infographic';
import { InfographicRenderer } from '../components/InfographicRenderer';
import { generateInfographic, generateFromPdf, extractPdf } from '../services/api';
import { THEMES } from '../services/themes';

interface HistoryItem {
  id: string;
  title: string;
  format: InfographicFormat;
  theme: ThemeName;
  data: InfographicData;
  userText: string;
  pdfName?: string;
  timestamp: string;
  isDemo: boolean;
  demoNotice?: string | null;
}

const FORMAT_OPTIONS: { id: InfographicFormat; label: string; icon: string; desc: string }[] = [
  { id: 'auto',        label: 'Auto Detect', icon: '✦', desc: 'Classifies best visual structure' },
  { id: 'process',     label: 'Process',     icon: '⚙', desc: 'Step-by-step workflow & stages' },
  { id: 'concept_map', label: 'Concept Map', icon: '🗺️', desc: 'Architectural overview & relationships' },
  { id: 'timeline',    label: 'Timeline',    icon: '📅', desc: 'Chronological progression & events' },
  { id: 'comparison',  label: 'Comparison',  icon: '⚖', desc: 'Side-by-side comparative analysis' },
];

const SAMPLE_PROMPTS = [
  {
    format: 'process' as InfographicFormat,
    title: 'Explain a Process',
    subtitle: 'Training a Deep Neural Network',
    icon: '⚙️',
    text: `The first step in training a deep neural network is to collect and preprocess data. Raw samples are cleaned, normalized, and partitioned into training and validation sets.
Next, you define the network architecture: the number of layers, neurons per layer, and activation functions such as ReLU and Softmax.
During forward propagation, inputs pass through each layer and are transformed by weighted connections to produce predictions.
The loss function then evaluates the objective prediction error against ground truth targets.
Backpropagation subsequently calculates the gradient of the loss with respect to each weight using the calculus chain rule.
The optimizer iteratively updates weights to minimize the loss landscape.
Finally, the model is evaluated on held-out test data and deployed for production inference.`,
  },
  {
    format: 'concept_map' as InfographicFormat,
    title: 'Create a Concept Map',
    subtitle: 'Neural Network Architecture & Principles',
    icon: '🗺️',
    text: `Neural networks are computational models inspired by biological neural circuits in animal brains.
The network architecture is composed of interconnected node layers including input, hidden, and output stages.
Activation functions such as ReLU, sigmoid, and GeLU introduce non-linearities essential for complex pattern recognition.
Synaptic weights determine signal transmission strength between connecting nodes throughout the network graph.
Loss functions quantitatively evaluate the divergence between predictions and target distributions.
Optimization algorithms like Adam and SGD iteratively navigate gradient descent to reach optimal parameter values.`,
  },
  {
    format: 'timeline' as InfographicFormat,
    title: 'Historical Timeline',
    subtitle: 'Key Milestones in Artificial Intelligence',
    icon: '📅',
    text: `The evolution of artificial intelligence spans key scientific milestones.
In 1950, Alan Turing published Computing Machinery and Intelligence, proposing the Turing Test.
In 1956, John McCarthy coined the term Artificial Intelligence at the Dartmouth Summer Research Project.
In 1997, IBM Deep Blue defeated world chess champion Garry Kasparov in a six-game match.
In 2012, AlexNet achieved breakthrough accuracy in computer vision using deep convolutional networks.
In 2017, Google researchers introduced the Transformer architecture with self-attention mechanisms.
In 2022, OpenAI launched ChatGPT, initiating the mainstream generative AI era.`,
  },
  {
    format: 'comparison' as InfographicFormat,
    title: 'Compare Two Technologies',
    subtitle: 'Supervised vs. Unsupervised Learning',
    icon: '⚖️',
    text: `Supervised learning and unsupervised learning represent fundamental paradigms in machine learning.
Supervised learning algorithms are trained using labeled datasets where ground truth outputs are explicitly provided.
In contrast, unsupervised learning processes unlabeled data to identify natural patterns and latent structures without human feedback.
Supervised learning is primarily utilized for classification, regression, and risk scoring.
Unsupervised learning focuses on customer segmentation, anomaly detection, dimensionality reduction, and clustering.
Common supervised algorithms include Support Vector Machines, Random Forests, and Gradient Boosting.
Common unsupervised algorithms include K-Means clustering, Principal Component Analysis (PCA), and Autoencoders.`,
  },
];

export const WorkspacePage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [text, setText] = useState('');
  const [format, setFormat] = useState<InfographicFormat>('auto');
  const [theme, setTheme] = useState<ThemeName>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<GenerateResponse | null>(null);
  const [activeUserPrompt, setActiveUserPrompt] = useState<string>('');
  const [activePdfName, setActivePdfName] = useState<string | undefined>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [pdfText, setPdfText] = useState('');

  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const infographicRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const activeTheme: ThemeConfig = THEMES[theme] || THEMES.default;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Scroll to response
  useEffect(() => {
    if (currentResult && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentResult]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePdfUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    setPdfFile(file);
    setPdfExtracting(true);
    setPdfText('');
    setError('');
    try {
      const res = await extractPdf(file);
      if (res.is_scanned || !res.success) {
        setError('This PDF appears to be image-based/scanned and has no extractable text. Please paste text directly.');
        setPdfFile(null);
      } else {
        setPdfText(res.text);
      }
    } catch {
      setError('Failed to extract text from PDF. Please check the file or paste text directly.');
      setPdfFile(null);
    } finally {
      setPdfExtracting(false);
    }
  };

  const handleGenerate = async (overrideText?: string, overrideFormat?: InfographicFormat) => {
    if (loading) return; // Prevent duplicate submissions

    const rawInput = overrideText ?? (pdfText || text);
    const chosenFormat = overrideFormat ?? format;

    if (!rawInput.trim()) {
      setError('Please enter some text or attach a PDF document.');
      return;
    }

    setLoading(true);
    setError('');

    const promptSummary = rawInput.trim().slice(0, 300) + (rawInput.trim().length > 300 ? '…' : '');
    setActiveUserPrompt(promptSummary);
    setActivePdfName(pdfFile ? pdfFile.name : undefined);

    try {
      let res: GenerateResponse;
      if (pdfFile && pdfText && !overrideText) {
        res = await generateFromPdf(pdfFile, chosenFormat, theme);
      } else {
        res = await generateInfographic(rawInput, chosenFormat, theme);
      }

      if (res.success && res.data) {
        setCurrentResult(res);

        // Add to history associating result with its prompt
        const newItem: HistoryItem = {
          id: `gen-${Date.now()}`,
          title: res.data.title || 'Infographic',
          format: (res.format_used as InfographicFormat) || chosenFormat,
          theme,
          data: res.data,
          userText: promptSummary,
          pdfName: pdfFile?.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isDemo: res.is_demo,
          demoNotice: res.demo_notice,
        };
        setHistory((prev) => [newItem, ...prev]);
        setActiveHistoryId(newItem.id);
      } else {
        setError(res.error || 'Generation failed. Please try again.');
      }
    } catch (err: unknown) {
      let msg = 'Failed to generate infographic.';
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        msg = typeof detail === 'string' ? detail : err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNewInfographic = () => {
    setText('');
    setPdfFile(null);
    setPdfText('');
    setCurrentResult(null);
    setActiveUserPrompt('');
    setActivePdfName(undefined);
    setActiveHistoryId(null);
    setError('');
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setActiveHistoryId(item.id);
    setCurrentResult({
      success: true,
      data: item.data,
      format_used: item.format,
      is_demo: item.isDemo,
      demo_notice: item.demoNotice,
    });
    setFormat(item.format);
    setTheme(item.theme);
    setActiveUserPrompt(item.userText);
    setActivePdfName(item.pdfName);
    setError('');
  };

  const handleExportPng = async () => {
    if (!infographicRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(infographicRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `infograph-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError('PNG export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleCopySummary = () => {
    if (!currentResult?.data) return;
    const d = currentResult.data;
    let summaryText = `# ${d.title}\n${d.subtitle}\n\n`;

    if (d.type === 'process') {
      summaryText += d.steps.map((s) => `${s.step_number}. **${s.title}**: ${s.description}`).join('\n\n');
    } else if (d.type === 'concept_map') {
      summaryText += `Main Concept: ${d.main_concept}\n\n`;
      summaryText += d.subtopics.map((s) => `* **${s.name}** [${s.relationship_to_main || 'Related'}]: ${s.description}`).join('\n\n');
    } else if (d.type === 'timeline') {
      summaryText += d.events.map((e) => `* **${e.label}**${e.date ? ` (${e.date})` : ''}: ${e.description}`).join('\n\n');
    } else if (d.type === 'comparison') {
      summaryText += `Items: ${d.items.map((i) => i.name).join(' vs ')}\n\n`;
      summaryText += d.attributes.map((a) => `### ${a.attribute}\n` + Object.entries(a.values).map(([k, v]) => `- ${k}: ${v}`).join('\n')).join('\n\n');
    }

    if (d.summary) {
      summaryText += `\n\n**Takeaway**: ${d.summary}`;
    }

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && (text.trim() || pdfText)) {
        handleGenerate();
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-900 text-white font-sans antialiased">
      {/* ── Left Collapsible Sidebar ────────────────────────────────────────── */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } flex-shrink-0 transition-all duration-300 ease-in-out bg-surface-800/90 border-r border-white/5 flex flex-col overflow-hidden relative z-20`}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full w-64 p-3.5">
            {/* Brand Header */}
            <div className="flex items-center justify-between px-2 py-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-accent-500 flex items-center justify-center shadow-md shadow-brand-500/25">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-white text-base leading-none">InfoGraph AI</h1>
                  <span className="text-[10px] text-white/40 tracking-wider">Visual Knowledge</span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* New Infographic Button */}
            <button
              onClick={handleNewInfographic}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-surface-700/60 hover:bg-surface-700 text-white text-xs font-semibold shadow-sm transition-all duration-200 mb-4 group cursor-pointer"
            >
              <Plus size={15} className="text-brand-400 group-hover:scale-110 transition-transform" />
              <span>New Infographic</span>
            </button>

            {/* History Section */}
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-1.5">
                Recent Visuals
              </div>
              {history.length === 0 ? (
                <div className="px-3 py-6 text-center text-white/30 text-xs">
                  <Cpu size={20} className="mx-auto mb-2 opacity-40" />
                  No generations yet in this session
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectHistory(item)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                        activeHistoryId === item.id
                          ? 'bg-brand-500/20 text-white border border-brand-500/30'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="truncate flex-1 mr-2">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                          <span className="capitalize">{item.format.replace('_', ' ')}</span> · {item.timestamp}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Conversation Area ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-gradient-to-b from-surface-900 via-surface-900 to-surface-800/40">
        {/* Top Header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-5 bg-surface-900/60 backdrop-blur-md z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Expand Sidebar"
                aria-label="Expand Sidebar"
              >
                <ChevronRight size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white/90">
                {currentResult?.data?.title || 'InfoGraph AI Workspace'}
              </span>
              {currentResult && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/5 capitalize">
                  {currentResult.format_used?.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentResult?.data && (
              <>
                <button
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title="Copy text summary of infographic"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                </button>
                <button
                  onClick={handleExportPng}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50"
                  title="Download Infographic as high-res PNG"
                >
                  <Download size={14} />
                  <span>{exporting ? 'Exporting…' : 'Download PNG'}</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Scrollable Chat Canvas */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 flex flex-col items-center">
          <div className="w-full max-w-4xl flex flex-col gap-6">

            {/* ── Welcome Screen (when idle) ──────────────────────────────── */}
            {!currentResult && !loading && (
              <div className="flex flex-col items-center text-center my-auto py-10 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500/20 to-accent-500/20 border border-brand-500/30 flex items-center justify-center mb-5 shadow-lg shadow-brand-500/10">
                  <Sparkles size={28} className="text-brand-400" />
                </div>
                <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">
                  Turn your ideas into visuals.
                </h2>
                <p className="text-sm text-white/50 max-w-lg mb-8 leading-relaxed">
                  Paste text or upload a document. InfoGraph AI will organize the key ideas into a clear, presentation-ready infographic.
                </p>

                {/* Example Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                  {SAMPLE_PROMPTS.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setText(sample.text);
                        setFormat(sample.format);
                        handleGenerate(sample.text, sample.format);
                      }}
                      className="p-3.5 rounded-xl border border-white/8 bg-surface-800/60 hover:bg-surface-700/80 hover:border-brand-500/40 transition-all duration-200 group text-left cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{sample.icon}</span>
                          <span className="text-xs font-semibold text-white group-hover:text-brand-300 transition-colors">
                            {sample.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">
                          {sample.subtitle}
                        </p>
                      </div>
                      <span className="text-[10px] text-brand-400 font-medium mt-2 self-end group-hover:translate-x-0.5 transition-transform">
                        Try sample →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── User Message Bubble ────────────────────────────────────── */}
            {(currentResult || loading || error) && activeUserPrompt && (
              <div className="flex justify-end w-full animate-slide-up">
                <div className="max-w-2xl rounded-2xl bg-surface-700/80 border border-white/10 px-4 py-3 text-xs text-white/90 shadow-md">
                  {activePdfName && (
                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10 text-emerald-400 font-medium">
                      <FileText size={14} />
                      <span>Document: {activePdfName}</span>
                    </div>
                  )}
                  <p className="leading-relaxed whitespace-pre-wrap">{activeUserPrompt}</p>
                </div>
              </div>
            )}

            {/* ── Loading State / Thinking ───────────────────────────────── */}
            {loading && (
              <div className="flex items-start gap-3 w-full animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkles size={16} className="text-white animate-spin-slow" />
                </div>
                <div className="flex-1 bg-surface-800/80 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-white/90">
                      Structuring content & composing infographic…
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    Extracting key principles, organizing relationships, and styling layout.
                  </p>
                </div>
              </div>
            )}

            {/* ── Assistant Response: Infographic ────────────────────────── */}
            {!loading && currentResult?.data && (
              <div className="flex flex-col gap-4 w-full animate-slide-up">
                {/* Header Controls: Live Theme Switcher & Regenerate */}
                <div className="flex items-center justify-between gap-2 px-1">
                  {/* Subtle, unobtrusive fallback notice if applicable */}
                  {currentResult.demo_notice ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-white/45 bg-surface-800/70 border border-white/5 px-2.5 py-1 rounded-lg">
                      <Info size={12} className="text-white/40 flex-shrink-0" />
                      <span>{currentResult.demo_notice}</span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* Quick Format & Theme Switchers */}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* Live Theme Switcher */}
                    <div className="flex items-center gap-1 bg-surface-800 border border-white/10 rounded-lg p-1">
                      {(Object.keys(THEMES) as ThemeName[]).map((tKey) => (
                        <button
                          key={tKey}
                          onClick={() => setTheme(tKey)}
                          title={`Theme: ${THEMES[tKey].label}`}
                          className={`w-5 h-5 rounded-md border transition-all cursor-pointer ${
                            theme === tKey ? 'scale-110 border-white shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                          style={{ background: THEMES[tKey].accent }}
                        />
                      ))}
                    </div>

                    {/* Regenerate Button */}
                    <button
                      onClick={() => handleGenerate()}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      title="Regenerate Infographic"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                {/* The Infographic Container */}
                <div className="flex justify-center w-full overflow-x-auto py-2">
                  <div
                    ref={infographicRef}
                    className="infographic-export-root inline-block rounded-2xl"
                  >
                    <InfographicRenderer data={currentResult.data} theme={activeTheme} />
                  </div>
                </div>
              </div>
            )}

            {/* Error Notification with Retry Action */}
            {error && !loading && (
              <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-200">Generation Failed</p>
                    <p className="mt-0.5 leading-relaxed">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerate()}
                  className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-medium border border-red-500/30 transition-colors flex-shrink-0 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={chatBottomRef} className="h-28" />
          </div>
        </div>

        {/* ── ChatGPT-Style Bottom Centered Composer ──────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-surface-900 via-surface-900/90 to-transparent flex justify-center z-20 pointer-events-none">
          <div className="w-full max-w-3xl pointer-events-auto">
            <div className="rounded-2xl border border-white/10 bg-surface-800/95 backdrop-blur-xl shadow-2xl p-2.5 flex flex-col gap-2 transition-all focus-within:border-brand-500/50 focus-within:ring-2 focus-within:ring-brand-500/20">

              {/* Uploaded PDF Chip */}
              {pdfFile && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface-700/60 border border-emerald-500/30 text-xs text-emerald-400">
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className="flex-shrink-0" />
                    <span className="truncate font-medium">{pdfFile.name}</span>
                    <span className="text-[10px] text-white/40">
                      {pdfExtracting ? 'Extracting…' : `(${pdfText.length.toLocaleString()} chars)`}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setPdfFile(null);
                      setPdfText('');
                    }}
                    className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    title="Remove PDF"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Text Input */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pdfFile ? "Add optional prompt or instructions..." : "Paste text or describe a process, system, or timeline…"}
                rows={1}
                className="w-full bg-transparent border-0 text-white placeholder-white/30 text-sm focus:outline-none resize-none px-2 py-1 leading-relaxed max-h-44"
              />

              {/* Controls Toolbar */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* PDF Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfUpload(f);
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={pdfExtracting}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Upload PDF document"
                  >
                    <Upload size={16} />
                  </button>

                  {/* Format Selector Pills */}
                  <div className="flex items-center gap-1 bg-surface-700/40 p-0.5 rounded-lg border border-white/5">
                    {FORMAT_OPTIONS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          format === f.id
                            ? 'bg-brand-500 text-white shadow-xs'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                        title={f.desc}
                      >
                        <span className="mr-1">{f.icon}</span>
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30 hidden sm:inline">
                    {(pdfText || text).length.toLocaleString()} chars
                  </span>
                  {/* Send Button */}
                  <button
                    onClick={() => handleGenerate()}
                    disabled={loading || pdfExtracting || (!text.trim() && !pdfText)}
                    className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-accent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:from-brand-400 hover:to-accent-400 transition-all cursor-pointer"
                    title="Generate Infographic (Enter)"
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </main>
    </div>
  );
};
