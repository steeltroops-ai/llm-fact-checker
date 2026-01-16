'use client';

import { useState } from 'react';
import { Search, CheckCircle2, XCircle, AlertCircle, Sparkles, Zap, ThumbsUp, ThumbsDown, AlertTriangle, Database } from 'lucide-react';

interface ExtractedClaim {
  text: string;
  entities: Record<string, string[]>;
  confidence: number;
}

interface Evidence {
  claim: string;
  similarity: number;
  source_url: string;
  publication_date: string;
  category: string;
  metadata?: Record<string, any>;
}

interface VerificationResult {
  claim: string;
  extracted_claim?: ExtractedClaim;
  verdict: 'true' | 'false' | 'uncertain' | 'unverifiable';
  confidence: number;
  explanation: string;
  reasoning?: string;
  evidence?: Evidence[];
  sources: string[];
  metadata?: Record<string, any>;
}

export default function Home() {
  const [claim, setClaim] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStage, setLoadingStage] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [useRagMode, setUseRagMode] = useState(true); // Toggle between RAG and AI-only mode

  // Different examples for RAG mode (PIB government facts) vs AI mode (general facts)
  const ragExampleClaims = [
    "The Indian government announced the PM-KISAN scheme which provides direct income support of Rs 6000 per year to all farmer families across the country to help with agricultural expenses", // TRUE - matches pib-2024-001
    "Under the Ayushman Bharat health insurance program, the government provides coverage of Rs 10 lakh per family annually to over 50 crore beneficiaries for medical treatment", // FALSE - actual is Rs 5 lakh (pib-2024-009)
    "India's economy grew at an impressive rate of 9.5% in the fiscal year 2023-24, making it the fastest growing major economy in the world" // UNCERTAIN - actual is 7.8% (pib-2024-017)
  ];

  const aiExampleClaims = [
    "The Earth takes approximately 365.25 days to complete one full orbit around the Sun, which is why we have a leap year every four years to account for the extra quarter day", // TRUE - astronomy fact
    "Scientists have discovered that humans can survive underwater for extended periods without any breathing equipment by training their lungs to extract oxygen directly from water like fish", // FALSE - biologically impossible
    "The Great Wall of China is the only man-made structure visible from the Moon with the naked eye, and astronauts regularly photograph it from space stations" // UNCERTAIN - common misconception, not actually visible
  ];

  const exampleClaims = useRagMode ? ragExampleClaims : aiExampleClaims;

  // Helper function to format text with proper line breaks and structure
  const formatText = (text: string) => {
    if (!text) return null;

    // Split by numbered points (1. 2. 3. etc.) or newlines
    const lines = text.split(/(?=\d+\.\s)|(?:\n)/g).filter(line => line.trim());

    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;

      // Check if it's a numbered point
      const isNumbered = /^\d+\.\s/.test(trimmedLine);

      return (
        <p
          key={index}
          className={`text-[13px] text-zinc-300 leading-relaxed ${index > 0 ? 'mt-2' : ''} ${isNumbered ? 'pl-0' : ''}`}
        >
          {trimmedLine}
        </p>
      );
    });
  };

  // Skeleton Loader Component
  const SkeletonLoader = () => (
    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-xl p-4 sm:p-5 lg:p-6 animate-fade-in shadow-xl shadow-black/20">
      {/* Loading Stage Message */}
      {loadingStage && (
        <div className="mb-4 p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-blue-400 text-[12px] sm:text-[13px] font-medium">{loadingStage}</p>
          </div>
        </div>
      )}

      {/* Skeleton Verdict Header */}
      <div className="bg-white/[0.02] border border-[#27272a] rounded-xl p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-800 rounded-lg animate-pulse"></div>
            <div>
              <div className="h-5 sm:h-6 w-20 sm:w-24 bg-zinc-800 rounded animate-pulse mb-1.5"></div>
              <div className="h-2 w-12 bg-zinc-800 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="text-right">
            <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse mb-1 ml-auto"></div>
            <div className="h-7 sm:h-8 w-16 sm:w-20 bg-zinc-800 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="mt-3 sm:mt-4 bg-black/40 rounded-full h-1 sm:h-1.5 overflow-hidden">
          <div className="h-full w-0 bg-gradient-to-r from-blue-500 to-purple-500 animate-loading-bar"></div>
        </div>
      </div>

      {/* Skeleton Claim */}
      <div className="mb-4 p-3 sm:p-3.5 lg:p-4 bg-black/40 rounded-lg border border-[#27272a]">
        <div className="h-2 w-20 bg-zinc-800 rounded animate-pulse mb-2"></div>
        <div className="h-4 bg-zinc-800 rounded animate-pulse mb-1.5"></div>
        <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse"></div>
      </div>

      {/* Skeleton Explanation */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <div className="w-0.5 h-3 sm:h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
          <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="pl-3 sm:pl-4 space-y-2">
          <div className="h-3 bg-zinc-800 rounded animate-pulse"></div>
          <div className="h-3 bg-zinc-800 rounded animate-pulse"></div>
          <div className="h-3 w-5/6 bg-zinc-800 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Skeleton Sources */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <div className="w-0.5 h-3 sm:h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
          <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="pl-3 sm:pl-4 space-y-2">
          <div className="h-3 bg-zinc-800 rounded animate-pulse"></div>
          <div className="h-3 w-4/5 bg-zinc-800 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Pulsing indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );

  const handleVerify = async () => {
    // Validate input before submission (Requirements 1.1, 1.2, 1.3)
    const trimmedClaim = claim.trim();

    if (!trimmedClaim) {
      setError('Please enter a claim to verify');
      return;
    }

    if (trimmedClaim.length > 1000) {
      setError('Claim is too long. Maximum 1000 characters allowed.');
      return;
    }

    // Handle loading states (Requirement 2.1)
    setLoading(true);
    setError('');
    setResult(null);
    setLoadingStage(useRagMode ? 'Extracting claims...' : 'Analyzing with AI...');

    try {
      // Simulate stage progression for better UX
      const stageInterval = setInterval(() => {
        setLoadingStage((prev) => {
          if (useRagMode) {
            if (prev === 'Extracting claims...') return 'Searching PIB fact database...';
            if (prev === 'Searching PIB fact database...') return 'Analyzing evidence...';
            if (prev === 'Analyzing evidence...') return 'Generating verdict...';
          } else {
            if (prev === 'Analyzing with AI...') return 'Generating verdict...';
          }
          return prev;
        });
      }, 1500);

      // Choose endpoint based on mode
      const endpoint = useRagMode ? '/api/rag/verify' : '/api/verify';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: trimmedClaim }),
      });

      clearInterval(stageInterval);

      // Handle error responses (Requirements 6.1, 6.4)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Verification failed';

        if (response.status === 400) {
          setError(`Invalid request: ${errorMessage}`);
        } else if (response.status === 503) {
          setError('Verification service is temporarily unavailable. Please try again in a moment.');
        } else if (response.status === 504) {
          setError('Request timed out. The claim may be too complex. Please try a simpler claim.');
        } else {
          setError(`Failed to verify claim: ${errorMessage}`);
        }
        return;
      }

      const data = await response.json();

      // Normalize verdict (handle both 'uncertain' and 'unverifiable')
      if (data.verdict === 'unverifiable') {
        data.verdict = 'uncertain';
      }

      setResult(data);
    } catch (err) {
      console.error('Error:', err);

      // Provide user-friendly error messages (Requirement 6.1)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect to the verification service. Please ensure the backend is running.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      // Always set loading to false after completion (Requirement 1.4)
      setLoading(false);
      setLoadingStage('');
      setFeedbackSubmitted(false); // Reset feedback state for new result
    }
  };

  // Generate claim ID for feedback
  const generateClaimId = (claim: string): string => {
    let hash = 0;
    for (let i = 0; i < claim.length; i++) {
      const char = claim.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  };

  // Submit feedback
  const submitFeedback = async (helpful: boolean) => {
    if (!result || feedbackSubmitted) return;

    setFeedbackLoading(true);
    try {
      const claimId = generateClaimId(result.claim);
      const response = await fetch('/api/rag/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_id: claimId,
          claim: result.claim,
          verdict: result.verdict,
          helpful: helpful,
          comment: ''
        }),
      });

      if (response.ok) {
        setFeedbackSubmitted(true);
      }
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Get confidence level and warning
  const getConfidenceLevel = (confidence: number): { level: string; color: string; warning: boolean } => {
    if (confidence >= 0.8) return { level: 'High', color: 'text-green-400', warning: false };
    if (confidence >= 0.5) return { level: 'Medium', color: 'text-yellow-400', warning: false };
    return { level: 'Low', color: 'text-orange-400', warning: true };
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleVerify();
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'true': return <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />;
      case 'false': return <XCircle className="w-5 h-5" strokeWidth={2.5} />;
      case 'unverifiable':
      case 'uncertain': return <AlertCircle className="w-5 h-5" strokeWidth={2.5} />;
      default: return <AlertCircle className="w-5 h-5" strokeWidth={2.5} />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'true': return 'from-emerald-500 to-emerald-600';
      case 'false': return 'from-red-500 to-red-600';
      case 'unverifiable':
      case 'uncertain': return 'from-amber-500 to-amber-600';
      default: return 'from-amber-500 to-amber-600';
    }
  };

  const getVerdictBg = (verdict: string) => {
    switch (verdict) {
      case 'true': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'false': return 'bg-red-500/10 border-red-500/20';
      case 'unverifiable':
      case 'uncertain': return 'bg-amber-500/10 border-amber-500/20';
      default: return 'bg-amber-500/10 border-amber-500/20';
    }
  };

  const getVerdictText = (verdict: string) => {
    switch (verdict) {
      case 'true': return 'text-emerald-400';
      case 'false': return 'text-red-400';
      case 'unverifiable':
      case 'uncertain': return 'text-amber-400';
      default: return 'text-amber-400';
    }
  };

  return (
    <main className="min-h-screen bg-black overflow-x-hidden">
      {/* Spotlight effect - Enhanced with mode-specific glow */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] sm:w-[1000px] sm:h-[600px] blur-[120px] sm:blur-[140px] rounded-full pointer-events-none transition-all duration-1000 ${useRagMode ? 'bg-red-500/[0.03]' : 'bg-blue-500/[0.03]'
        }`} />

      {/* Grid overlay - Dynamic color mesh */}
      <div className={`fixed inset-0 bg-[size:64px_64px] sm:bg-[size:80px_80px] pointer-events-none transition-all duration-1000 ${useRagMode
        ? 'bg-[linear-gradient(rgba(239,68,68,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.03)_1px,transparent_1px)]'
        : 'bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)]'
        }`} />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Header - Enhanced responsive typography */}
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <div className={`inline-flex items-center gap-2 mb-4 sm:mb-5 px-3 py-1.5 bg-white/[0.03] backdrop-blur-sm rounded-full border transition-all duration-500 hover:bg-white/[0.05] ${useRagMode ? 'border-red-500/20 hover:border-red-500/30' : 'border-blue-500/20 hover:border-blue-500/30'
            }`}>
            {useRagMode ? (
              <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" strokeWidth={2} />
            ) : (
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" strokeWidth={2} />
            )}
            <span className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider transition-colors duration-500 ${useRagMode ? 'text-red-400' : 'text-blue-400'
              }`}>
              {useRagMode ? 'RAG-Powered' : 'AI-Powered'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 tracking-tight leading-[1.1] px-4">
            <span className="bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent">
              Fact Checker
            </span>
          </h1>

          <div className="h-7 sm:h-8 mb-2 flex items-center justify-center"> {/* Fixed height container */}
            <p className="text-[13px] sm:text-[14px] lg:text-[15px] text-zinc-400 max-w-md mx-auto leading-relaxed px-4 transition-opacity duration-500">
              {useRagMode
                ? 'Verify claims against verified government database'
                : 'Verify claims instantly using AI analysis'
              }
            </p>
          </div>

          {/* Trust indicators - Enhanced with better spacing */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 mt-5 sm:mt-6 text-[10px] sm:text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
            <div className="flex items-center gap-1.5 transition-colors hover:text-zinc-400 duration-200 cursor-default">
              <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse"></div>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5 transition-colors hover:text-zinc-400 duration-200 cursor-default">
              <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></div>
              <span>Accurate</span>
            </div>
            <div className="flex items-center gap-1.5 transition-colors hover:text-zinc-400 duration-200 cursor-default">
              <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse"></div>
              <span>Fast</span>
            </div>
          </div>
        </div>

        {/* Main Input Card - Enhanced with better shadows and transitions */}
        <div className="bg-[#0A0A0A] border border-[#27272a] rounded-xl p-4 sm:p-5 lg:p-6 mb-5 sm:mb-6 hover:border-[#3f3f46] transition-all duration-300 shadow-2xl shadow-black/30 hover:shadow-black/40">
          {/* Header with Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <label className="text-[10px] sm:text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Enter Claim
            </label>

            {/* Compact Toggle with External Labels and Icons */}
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1 transition-all duration-500 ${!useRagMode ? 'text-blue-400 brightness-110 scale-105' : 'text-zinc-600 grayscale opacity-60'
                }`}>
                <Zap className="w-3 h-3" strokeWidth={2.5} />
                <span className="text-[9px] font-semibold tracking-wide">AI</span>
              </div>

              {/* Compact Glassmorphism Toggle Switch */}
              <button
                onClick={() => setUseRagMode(!useRagMode)}
                className="relative w-8 h-[18px] rounded-full border border-white/20 bg-white/5 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] group transition-all duration-300 hover:border-white/30 hover:scale-105 flex-shrink-0"
                aria-label="Toggle Mode"
                style={{
                  boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.05)'
                }}
              >
                {/* Track Glow - Subtle */}
                <div className={`absolute inset-0 rounded-full transition-all duration-500 ${useRagMode ? 'bg-red-500/20 opacity-30' : 'bg-blue-500/20 opacity-30'
                  }`} />

                {/* Glass Knob */}
                <div
                  className={`absolute top-[1.5px] w-[13px] h-[13px] rounded-full transition-all duration-300 ease-out backdrop-blur-md flex items-center justify-center border border-white/40 ${useRagMode ? 'left-[calc(100%-15px)] bg-red-500/10' : 'left-[1.5px] bg-blue-500/10'
                    }`}
                  style={{
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.4)',
                    background: useRagMode
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))'
                  }}
                >
                  {/* Subtle shine on knob */}
                  <div className="absolute top-[1.5px] left-[1.5px] w-[5px] h-[2.5px] rounded-[100%] bg-white/40 blur-[0.5px]" />
                </div>
              </button>

              <div className={`flex items-center gap-1 transition-all duration-500 ${useRagMode ? 'text-red-400 brightness-110 scale-105' : 'text-zinc-600 grayscale opacity-60'
                }`}>
                <span className="text-[9px] font-semibold tracking-wide">RAG</span>
                <Database className="w-3 h-3" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Mode Description - Fixed Height Container to prevent layout shift */}
          <div className="h-4 mb-4">
            <p className="text-[10px] text-zinc-500/80 font-medium tracking-wide transition-opacity duration-500">
              {useRagMode
                ? 'SEARCHING GOVERNMENT RECORDS'
                : 'GENERATIVE AI ANALYSIS'
              }
            </p>
          </div>

          <div className="relative">
            <textarea
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 sm:p-3.5 bg-black/50 border border-[#27272a] rounded-lg focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 resize-none text-white placeholder:text-zinc-600 text-[13px] sm:text-[14px] leading-relaxed outline-none hover:border-[#3f3f46] min-h-[88px] focus:bg-black/60"
              rows={3}
              placeholder={useRagMode
                ? "e.g., PM Modi launched Ayushman Bharat health scheme"
                : "e.g., Water boils at 100 degrees Celsius"
              }
              maxLength={1000}
              aria-label="Enter claim to verify"
            />
            <div className="absolute bottom-2 right-2 text-[9px] sm:text-[10px] text-zinc-600 font-mono tabular-nums pointer-events-none">
              {claim.length}/1000
            </div>
          </div>

          {/* Example Claims - Enhanced responsive layout */}
          <div className="mt-4 space-y-2">
            <span className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Quick Examples</span>
            <div className="flex flex-wrap gap-2">
              {exampleClaims.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setClaim(example)}
                  className="text-[10px] sm:text-[11px] px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 rounded-md transition-all duration-200 border border-[#27272a] hover:border-[#3f3f46] active:scale-95 hover:shadow-lg"
                  aria-label={`Use example: ${example}`}
                >
                  {example.slice(0, 40)}{example.length > 40 ? '...' : ''}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !claim.trim()}
            className="mt-5 w-full bg-white text-black px-4 py-2 rounded-lg font-semibold text-[12px] hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-white/10 hover:shadow-lg hover:shadow-white/15 active:scale-[0.98] relative overflow-hidden disabled:hover:shadow-md"
            aria-label="Verify claim"
          >
            {loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Verify Claim</span>
              </>
            )}
          </button>

          <p className="mt-2 text-[9px] sm:text-[10px] text-center text-zinc-600 uppercase tracking-wider">
            Press <kbd className="px-1.5 py-0.5 bg-[#18181b] text-zinc-400 rounded border border-[#27272a] font-mono text-[8px] sm:text-[9px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-[#18181b] text-zinc-400 rounded border border-[#27272a] font-mono text-[8px] sm:text-[9px]">Enter</kbd> to verify
          </p>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg animate-fade-in">
              <div className="flex items-start gap-2.5 mb-2">
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-red-400 text-[13px] font-semibold mb-1">Verification Error</p>
                  <p className="text-red-300/90 text-[12px] leading-relaxed">{error}</p>
                </div>
              </div>
              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full mt-3 py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-md text-[11px] font-medium transition-all duration-200 border border-red-500/30 hover:border-red-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Retry verification"
              >
                Retry Verification
              </button>
            </div>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading && <SkeletonLoader />}

        {/* Results Card - Enhanced with better responsive design */}
        {result && !loading && (
          <div className="bg-[#0A0A0A] border border-[#27272a] rounded-xl p-4 sm:p-5 lg:p-6 animate-fade-in shadow-2xl shadow-black/30">

            {/* Mode Indicator Badge - Minimal */}
            <div className="flex items-center justify-between mb-4">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-medium transition-all duration-300 ${result.evidence && result.evidence.length > 0
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                {result.evidence && result.evidence.length > 0 ? (
                  <>
                    <Database className="w-2.5 h-2.5" strokeWidth={2} />
                    RAG
                  </>
                ) : (
                  <>
                    <Zap className="w-2.5 h-2.5" strokeWidth={2} />
                    AI
                  </>
                )}
              </div>
            </div>

            {/* Verdict Header - Compact */}
            <div className={`${getVerdictBg(result.verdict)} border rounded-lg p-2.5 mb-3 transition-all duration-300`}>
              <div className="flex items-center justify-between gap-3">
                {/* Verdict */}
                <div className="flex items-center gap-2">
                  <div className={`bg-gradient-to-br ${getVerdictColor(result.verdict)} text-white p-1.5 rounded-lg shadow-lg`}>
                    {getVerdictIcon(result.verdict)}
                  </div>
                  <div>
                    <h2 className={`text-sm font-bold uppercase tracking-wide ${getVerdictText(result.verdict)}`}>
                      {result.verdict === 'true' && 'Verified'}
                      {result.verdict === 'false' && 'False'}
                      {(result.verdict === 'uncertain' || result.verdict === 'unverifiable') && 'Uncertain'}
                    </h2>
                    <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-medium">Verdict</p>
                  </div>
                </div>

                {/* Confidence */}
                <div className="text-right">
                  <div className="text-lg font-bold text-white tabular-nums">
                    {(result.confidence * 100).toFixed(0)}%
                  </div>
                  <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-medium">Confidence</p>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="mt-2 bg-black/40 rounded-full h-0.5 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getVerdictColor(result.verdict)} transition-all duration-1000 ease-out shadow-sm`}
                  style={{ width: `${result.confidence * 100}%` }}
                ></div>
              </div>

              {/* Low Confidence Warning */}
              {getConfidenceLevel(result.confidence).warning && (
                <div className="mt-2 flex items-center gap-1.5 p-1.5 bg-orange-500/10 border border-orange-500/20 rounded">
                  <AlertTriangle className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" strokeWidth={2} />
                  <span className="text-[9px] text-orange-400 font-medium">
                    Low confidence - verify with additional sources
                  </span>
                </div>
              )}
            </div>

            {/* Claim Display - Minimal */}
            <div className="mb-4 p-3 bg-black/40 rounded-lg border border-[#27272a] hover:border-[#3f3f46] transition-all duration-200">
              <h3 className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Claim
              </h3>
              <p className="text-[13px] text-zinc-300 leading-relaxed">"{result.claim}"</p>
            </div>

            {/* Extracted Claim Display (if available from RAG) - Minimal */}
            {result.extracted_claim && result.extracted_claim.text !== result.claim && (
              <div className="mb-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20 hover:border-blue-500/30 transition-all duration-200">
                <h3 className="text-[9px] font-medium text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                  Extracted
                </h3>
                <p className="text-[13px] text-zinc-300 leading-relaxed mb-2">
                  "{result.extracted_claim.text}"
                </p>
                {/* Display entities if available */}
                {Object.keys(result.extracted_claim.entities).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(result.extracted_claim.entities).map(([type, values]) =>
                      values.map((value, idx) => (
                        <span
                          key={`${type}-${idx}`}
                          className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded border border-blue-500/20 uppercase tracking-wider font-medium"
                        >
                          {type}: {value}
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reasoning (if available from RAG) */}
            {result.reasoning && (
              <div className="mb-3">
                <h3 className="text-[10px] font-semibold text-zinc-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                  <div className="w-0.5 h-0.5 bg-blue-400 rounded-full"></div>
                  Analysis
                </h3>
                <div className="text-[13px] text-zinc-300 leading-relaxed pl-3 space-y-2">
                  {formatText(result.reasoning)}
                </div>
              </div>
            )}

            {/* Explanation */}
            <div className="mb-3">
              <h3 className="text-[10px] font-semibold text-zinc-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                <div className="w-0.5 h-0.5 bg-purple-400 rounded-full"></div>
                Explanation
              </h3>
              <div className="text-[13px] text-zinc-300 leading-relaxed pl-3 space-y-2">
                {formatText(result.explanation)}
              </div>
            </div>

            {/* Evidence Display (if available from RAG) - Compact */}
            {result.evidence && result.evidence.length > 0 && (
              <div className="mb-3">
                <h3 className="text-[10px] font-semibold text-zinc-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                  <div className="w-0.5 h-0.5 bg-green-400 rounded-full"></div>
                  Supporting Evidence ({result.evidence.length})
                </h3>
                <div className="space-y-2">
                  {result.evidence.map((evidence, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-black/40 rounded-lg border border-[#27272a] hover:border-[#3f3f46] transition-all duration-200"
                    >
                      {/* Evidence header with similarity score */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">
                          Source {i + 1}
                        </span>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/10 rounded border border-green-500/20">
                          <div className="text-[9px] font-mono font-bold text-green-400">
                            {(evidence.similarity * 100).toFixed(0)}%
                          </div>
                          <span className="text-[8px] text-green-400/70 uppercase tracking-wider">
                            Match
                          </span>
                        </div>
                      </div>

                      {/* Evidence claim text */}
                      <p className="text-[12px] text-zinc-300 leading-relaxed mb-2">
                        {evidence.claim}
                      </p>

                      {/* Footer: Category/Date on left, Source link on right */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: Category and Date */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-zinc-500">
                          {evidence.category && (
                            <span className="px-1.5 py-0.5 bg-zinc-800/50 rounded border border-[#27272a]">
                              {evidence.category}
                            </span>
                          )}
                          {evidence.publication_date && (
                            <span className="flex items-center gap-1">
                              <span className="text-zinc-600">•</span>
                              {new Date(evidence.publication_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>

                        {/* Right: Source link */}
                        {evidence.source_url && (
                          <a
                            href={evidence.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium flex-shrink-0"
                          >
                            <span>View Source</span>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources - Improved styling */}
            {result.sources && result.sources.length > 0 && !result.evidence && (
              <div className="mb-4">
                <h3 className="text-[11px] font-semibold text-zinc-400 mb-2.5 flex items-center gap-2 uppercase tracking-wide">
                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                  Sources
                </h3>
                <ul className="space-y-2">
                  {result.sources.map((source, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-400 leading-relaxed hover:text-zinc-300 transition-colors duration-200">
                      <span className="text-zinc-600 font-mono text-[11px] mt-0.5 flex-shrink-0">{i + 1}.</span>
                      <span>{source}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timing Metadata (optional, if available) */}
            {result.metadata && result.metadata.total_time && (
              <div className="mb-4 p-3 bg-black/20 rounded-lg border border-[#27272a]">
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="uppercase tracking-wider font-medium">Processing Time</span>
                  <span className="font-mono text-zinc-400 font-semibold">
                    {result.metadata.total_time.toFixed(2)}s
                  </span>
                </div>
                {result.metadata.facts_retrieved !== undefined && (
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5">
                    <span className="uppercase tracking-wider font-medium">Facts Retrieved</span>
                    <span className="font-mono text-zinc-400 font-semibold">
                      {result.metadata.facts_retrieved}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Toggle - Compact */}
            <div className="mb-4 p-3.5 bg-black/30 rounded-lg border border-[#27272a]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-zinc-400 font-medium">
                  Was this helpful?
                </span>

                {!feedbackSubmitted ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => submitFeedback(true)}
                      disabled={feedbackLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-md text-[11px] font-medium transition-all duration-200 border border-green-500/20 hover:border-green-500/30 disabled:opacity-50 active:scale-95"
                      aria-label="Mark as helpful"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>Yes</span>
                    </button>
                    <button
                      onClick={() => submitFeedback(false)}
                      disabled={feedbackLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md text-[11px] font-medium transition-all duration-200 border border-red-500/20 hover:border-red-500/30 disabled:opacity-50 active:scale-95"
                      aria-label="Mark as not helpful"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>No</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                    <span className="text-[11px] font-medium">Thank you!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Verify Another Button - Compact */}
            <button
              onClick={() => {
                setResult(null);
                setClaim('');
                setFeedbackSubmitted(false);
              }}
              className="w-full py-2.5 px-4 border border-[#27272a] bg-white/[0.03] hover:bg-white/[0.06] text-white rounded-lg font-semibold text-[12px] transition-all duration-200 active:scale-[0.98] hover:border-[#3f3f46]"
              aria-label="Verify another claim"
            >
              Verify Another Claim
            </button>
          </div>
        )}

        {/* Footer - Enhanced with better spacing */}
        <div className="mt-10 sm:mt-12 lg:mt-16 text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/[0.02] rounded-full border border-white/[0.05] hover:border-white/[0.08] transition-all duration-300 hover:bg-white/[0.03]">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-600" strokeWidth={2} />
            <p className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
              Powered by Google Gemini AI
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        @keyframes loading-bar {
          0% {
            width: 0%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 100%;
          }
        }
        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out infinite;
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          50% {
            transform: translateY(-8px);
            opacity: 0.7;
          }
        }
        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
