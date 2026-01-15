'use client';

import { useState } from 'react';
import { Search, CheckCircle2, XCircle, AlertCircle, Sparkles, TrendingUp, ExternalLink } from 'lucide-react';

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

    const handleVerify = async () => {
        if (!claim.trim()) {
            setError('Please enter a claim to verify');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claim }),
            });

            if (!response.ok) {
                throw new Error('Verification failed');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to verify claim. Please ensure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleVerify();
        }
    };

    const getVerdictIcon = (verdict: string) => {
        switch (verdict) {
            case 'true': return <CheckCircle2 className="w-8 h-8" />;
            case 'false': return <XCircle className="w-8 h-8" />;
            default: return <AlertCircle className="w-8 h-8" />;
        }
    };

    const getVerdictColor = (verdict: string) => {
        switch (verdict) {
            case 'true': return 'from-green-500 to-emerald-600';
            case 'false': return 'from-red-500 to-rose-600';
            default: return 'from-yellow-500 to-amber-600';
        }
    };

    const getVerdictBg = (verdict: string) => {
        switch (verdict) {
            case 'true': return 'bg-green-50 border-green-200';
            case 'false': return 'bg-red-50 border-red-200';
            default: return 'bg-yellow-50 border-yellow-200';
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative max-w-5xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <span className="text-sm font-medium text-gray-700">AI-Powered Fact Verification</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Fact Checker
                    </h1>

                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Verify claims instantly using advanced AI and semantic analysis.
                        Get confidence scores, detailed explanations, and source attribution.
                    </p>
                </div>

                {/* Main Input Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Enter your claim
                    </label>

                    <div className="relative">
                        <textarea
                            value={claim}
                            onChange={(e) => setClaim(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full p-4 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-gray-800 placeholder-gray-400"
                            rows={4}
                            placeholder="e.g., Water boils at 100 degrees Celsius at sea level..."
                            maxLength={1000}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                            {claim.length}/1000
                        </div>
                    </div>

                    {/* Example Claims */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500 mr-2">Try:</span>
                        {exampleClaims.map((example, i) => (
                            <button
                                key={i}
                                onClick={() => setClaim(example)}
                                className="text-xs px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full transition-colors"
                            >
                                {example.slice(0, 30)}...
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleVerify}
                        disabled={loading || !claim.trim()}
                        className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Analyzing claim...</span>
                            </>
                        ) : (
                            <>
                                <Search className="w-5 h-5" />
                                <span>Verify Claim</span>
                            </>
                        )}
                    </button>

                    <p className="mt-3 text-xs text-center text-gray-500">
                        Press <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> to verify
                    </p>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
                            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Results Card */}
                {result && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-fade-in">
                        {/* Verdict Header */}
                        <div className={`${getVerdictBg(result.verdict)} border-2 rounded-xl p-6 mb-6`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`bg-gradient-to-br ${getVerdictColor(result.verdict)} text-white p-3 rounded-xl`}>
                                        {getVerdictIcon(result.verdict)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                                            {result.verdict}
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-1">Verification Result</p>
                                    </div>
                                </div>

                                {/* Confidence Score */}
                                <div className="text-right">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-600">Confidence</span>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-800">
                                        {(result.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>

                            {/* Confidence Bar */}
                            <div className="mt-4 bg-white/50 rounded-full h-3 overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${getVerdictColor(result.verdict)} transition-all duration-1000 ease-out`}
                                    style={{ width: `${result.confidence * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Claim Display */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Analyzed Claim
                            </h3>
                            <p className="text-gray-800 italic">"{result.claim}"</p>
                        </div>

                        {/* Explanation */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <div className="w-1 h-6 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
                                Explanation
                            </h3>
                            <p className="text-gray-700 leading-relaxed pl-4">
                                {result.explanation}
                            </p>
                        </div>

                        {/* Sources */}
                        {result.sources && result.sources.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-6 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
                                    Sources
                                </h3>
                                <ul className="space-y-2 pl-4">
                                    {result.sources.map((source, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-700">
                                            <ExternalLink className="w-4 h-4 flex-shrink-0 mt-1 text-indigo-600" />
                                            <span>{source}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Verify Another Button */}
                        <button
                            onClick={() => {
                                setResult(null);
                                setClaim('');
                            }}
                            className="mt-6 w-full py-3 px-6 border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
                        >
                            Verify Another Claim
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 text-center text-sm text-gray-500">
                    <p>Powered by Google Gemini AI • Built with Next.js & FastAPI</p>
                    <p className="mt-2">For Artikate Studio ML Engineer Role</p>
                </div>
            </div>

            <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
        </main>
    );
}
