'use client';

import { useState } from 'react';
import { Search, CheckCircle2, XCircle, AlertCircle, Sparkles, TrendingUp, Zap } from 'lucide-react';

interface VerificationResult {
  claim: string;
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number;
  explanation: string;
  sources: string[];
}

export default function Home() {
  const [claim, setClaim] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const exampleClaims = [
    "Water boils at 100 degrees Celsius at sea level",
    "The Earth is flat",
    "AI will replace all jobs by 2030"
  ];

  // Skeleton Loader Component
  const SkeletonLoader = () => (
    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-xl p-4 sm:p-5 lg:p-6 animate-fade-in shadow-xl shadow-black/20">
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

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Make POST request to backend (Requirement 2.1)
      const response = await fetch(`${apiUrl}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: trimmedClaim }),
      });

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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleVerify();
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'true': return <CheckCircle2 className="w-5 h-5" strokeWidth={2} />;
      case 'false': return <XCircle className="w-5 h-5" strokeWidth={2} />;
      default: return <AlertCircle className="w-5 h-5" strokeWidth={2} />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'true': return 'from-[#10B981] to-[#059669]';
      case 'false': return 'from-[#EF4444] to-[#DC2626]';
      default: return 'from-[#F59E0B] to-[#D97706]';
    }
  };

  const getVerdictBg = (verdict: string) => {
    switch (verdict) {
      case 'true': return 'bg-[#10B981]/10 border-[#10B981]/20';
      case 'false': return 'bg-[#EF4444]/10 border-[#EF4444]/20';
      default: return 'bg-[#F59E0B]/10 border-[#F59E0B]/20';
    }
  };

  const getVerdictText = (verdict: string) => {
    switch (verdict) {
      case 'true': return 'text-[#10B981]';
      case 'false': return 'text-[#EF4444]';
      default: return 'text-[#F59E0B]';
    }
  };

  return (
    <main className="min-h-screen bg-black overflow-x-hidden">
      {/* Spotlight effect - Enhanced with better blur and positioning */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] sm:w-[1000px] sm:h-[600px] bg-blue-500/[0.04] blur-[120px] sm:blur-[140px] rounded-full pointer-events-none transition-all duration-1000" />

      {/* Grid overlay - Responsive grid size */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] sm:bg-[size:80px_80px] pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Header - Enhanced responsive typography */}
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <div className="inline-flex items-center gap-2 mb-4 sm:mb-5 px-3 py-1.5 bg-white/[0.03] backdrop-blur-sm rounded-full border border-white/[0.08] hover:border-white/[0.12] transition-all duration-300 hover:bg-white/[0.05]">
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" strokeWidth={2} />
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-400 uppercase tracking-wider">AI-Powered</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold mb-3 sm:mb-4 tracking-tight leading-[1.1] px-4">
            <span className="bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent">
              Fact Checker
            </span>
          </h1>

          <p className="text-[13px] sm:text-[14px] lg:text-[15px] text-zinc-400 max-w-md mx-auto leading-relaxed px-4">
            Verify claims instantly using advanced AI
          </p>

          {/* Trust indicators - Enhanced with better spacing */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 mt-5 sm:mt-6 text-[10px] sm:text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
            <div className="flex items-center gap-1.5 transition-colors hover:text-zinc-400 duration-200">
              <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse"></div>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5 transition-colors hover:text-zinc-400 duration-200">
              <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></div>
              <span>Accurate</span>
            </div>
            <div className="flex items-center gap-1.5 transition-colors hover:text-zinc-400 duration-200">
              <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse"></div>
              <span>Fast</span>
            </div>
          </div>
        </div>

        {/* Main Input Card - Enhanced with better shadows and transitions */}
        <div className="bg-[#0A0A0A] border border-[#27272a] rounded-xl p-4 sm:p-5 lg:p-6 mb-5 sm:mb-6 hover:border-[#3f3f46] transition-all duration-300 shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transform hover:-translate-y-0.5">
          <label className="block text-[10px] sm:text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Enter Claim
          </label>

          <div className="relative">
            <textarea
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 sm:p-3.5 bg-black/50 border border-[#27272a] rounded-lg focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 resize-none text-white placeholder:text-zinc-600 text-[13px] sm:text-[14px] leading-relaxed outline-none hover:border-[#3f3f46]"
              rows={3}
              placeholder="e.g., Water boils at 100 degrees Celsius at sea level"
              maxLength={1000}
            />
            <div className="absolute bottom-2 right-2 text-[9px] sm:text-[10px] text-zinc-600 font-mono tabular-nums">
              {claim.length}/1000
            </div>
          </div>

          {/* Example Claims - Enhanced responsive layout */}
          <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
            <span className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Examples</span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {exampleClaims.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setClaim(example)}
                  className="text-[10px] sm:text-[11px] px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-300 rounded-md transition-all duration-200 border border-[#27272a] hover:border-[#3f3f46] active:scale-95"
                >
                  {example.slice(0, 35)}...
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !claim.trim()}
            className="mt-4 sm:mt-5 w-full bg-white text-black px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-[12px] sm:text-[13px] hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-white/5 hover:shadow-xl hover:shadow-white/10 active:scale-[0.98] relative overflow-hidden"
          >
            {loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
                <span>Verify Claim</span>
              </>
            )}
          </button>

          <p className="mt-2 sm:mt-3 text-[9px] sm:text-[10px] text-center text-zinc-600 uppercase tracking-wider">
            <kbd className="px-1.5 py-0.5 bg-[#18181b] text-zinc-400 rounded border border-[#27272a] font-mono text-[8px] sm:text-[9px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-[#18181b] text-zinc-400 rounded border border-[#27272a] font-mono text-[8px] sm:text-[9px]">Enter</kbd>
          </p>

          {error && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg animate-fade-in">
              <div className="flex items-start gap-2 mb-2">
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-red-400 text-[12px] sm:text-[13px] font-medium mb-1">Error</p>
                  <p className="text-red-300 text-[11px] sm:text-[12px] leading-relaxed">{error}</p>
                </div>
              </div>
              <button
                onClick={handleVerify}
                className="w-full mt-2 py-1.5 sm:py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-md text-[10px] sm:text-[11px] font-medium transition-all duration-200 border border-red-500/30 hover:border-red-500/40 active:scale-95"
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
          <div className="bg-[#0A0A0A] border border-[#27272a] rounded-xl p-4 sm:p-5 lg:p-6 animate-fade-in shadow-xl shadow-black/20 transform hover:-translate-y-0.5 transition-all duration-300">
            {/* Verdict Header - Enhanced responsive layout */}
            <div className={`${getVerdictBg(result.verdict)} border rounded-xl p-3 sm:p-4 mb-4 transition-all duration-300`}>
              <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className={`bg-gradient-to-br ${getVerdictColor(result.verdict)} text-white p-2 sm:p-2.5 rounded-lg shadow-lg transition-transform duration-300 hover:scale-110`}>
                    {getVerdictIcon(result.verdict)}
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wide ${getVerdictText(result.verdict)} transition-colors duration-300`}>
                      {result.verdict}
                    </h2>
                    <p className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mt-0.5">Verdict</p>
                  </div>
                </div>

                {/* Confidence Score - Enhanced typography */}
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-0.5 justify-end">
                    <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-600" strokeWidth={2} />
                    <span className="text-[9px] sm:text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Confidence</span>
                  </div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tabular-nums">
                    {(result.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Confidence Bar - Enhanced animation */}
              <div className="mt-3 sm:mt-4 bg-black/40 rounded-full h-1 sm:h-1.5 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getVerdictColor(result.verdict)} transition-all duration-1000 ease-out shadow-lg`}
                  style={{ width: `${result.confidence * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Claim Display - Enhanced padding and typography */}
            <div className="mb-4 p-3 sm:p-3.5 lg:p-4 bg-black/40 rounded-lg border border-[#27272a] hover:border-[#3f3f46] transition-all duration-200">
              <h3 className="text-[9px] sm:text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
                Analyzed Claim
              </h3>
              <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-zinc-300 leading-relaxed">"{result.claim}"</p>
            </div>

            {/* Explanation - Enhanced spacing */}
            <div className="mb-4">
              <h3 className="text-[11px] sm:text-[12px] font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2 uppercase tracking-wide">
                <div className="w-0.5 h-3 sm:h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                Explanation
              </h3>
              <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-zinc-400 leading-relaxed pl-3 sm:pl-4">
                {result.explanation}
              </p>
            </div>

            {/* Sources - Enhanced list styling */}
            {result.sources && result.sources.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[11px] sm:text-[12px] font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <div className="w-0.5 h-3 sm:h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                  Sources
                </h3>
                <ul className="space-y-2 sm:space-y-2.5 pl-3 sm:pl-4">
                  {result.sources.map((source, i) => (
                    <li key={i} className="flex items-start gap-2 sm:gap-2.5 text-[11px] sm:text-[12px] lg:text-[13px] text-zinc-400 leading-relaxed hover:text-zinc-300 transition-colors duration-200">
                      <span className="text-zinc-600 font-mono text-[10px] sm:text-[11px] mt-0.5">{i + 1}.</span>
                      <span>{source}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verify Another Button - Enhanced with better hover states */}
            <button
              onClick={() => {
                setResult(null);
                setClaim('');
              }}
              className="w-full py-2.5 sm:py-3 px-4 border border-[#27272a] bg-white/[0.03] hover:bg-white/[0.06] text-white rounded-lg font-semibold text-[11px] sm:text-[12px] transition-all duration-200 active:scale-[0.98] hover:border-[#3f3f46]"
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
