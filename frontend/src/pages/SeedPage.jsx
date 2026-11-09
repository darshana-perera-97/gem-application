import React, { useState } from 'react';
import { Database, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiPost } from '../lib/api';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

export const SeedPage = () => {
  const [status, setStatus] = useState('IDLE');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const seedData = async () => {
    setStatus('SEEDING');
    setProgress(0);
    setError(null);

    try {
      setProgress(40);
      await apiPost('/api/seed');
      setProgress(100);
      setStatus('SUCCESS');
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus('ERROR');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Seo title={PAGE_SEO.seed.title} description={PAGE_SEO.seed.description} noindex />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-8 text-center border-b border-gray-100">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
            <Database size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">MVP Data Seeding</h1>
          <p className="text-gray-500">
            Click the button below to store the platform catalog in MongoDB
            (vendors, gems, social feed, users, shorts, and events).
          </p>
        </div>
        
        <div className="p-8">
          {status === 'IDLE' && (
            <button 
              onClick={seedData}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Play size={20} />
              Start Seeding Platform Data
            </button>
          )}

          {status === 'SEEDING' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={40} className="text-primary animate-spin" />
                <p className="font-bold text-gray-900">Seeding Platform Content... {progress}%</p>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {status === 'SUCCESS' && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Platform Seeded Successfully!</h2>
              <p className="text-gray-500">Vendors, gems, posts, and the rest of the catalog are stored in MongoDB.</p>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold mt-4"
              >
                Go to Home Feed
              </button>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex gap-4">
              <AlertCircle className="text-red-600 shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-red-900 mb-1">Seeding Failed</h3>
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  onClick={seedData}
                  className="mt-4 text-sm font-bold text-red-600 hover:underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
