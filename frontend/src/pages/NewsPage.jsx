import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { apiGet } from '../lib/api';
import { useActivity } from '../contexts/ActivityContext';
import { usePageReady } from '../contexts/PageLoadingContext';
import { LoadingImage } from '../components/ui/LoadingImage';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO, truncateMeta } from '../lib/seo';

export const NewsPage = () => {
  const [article, setArticle] = useState(null);
  const { reads, toggleArticle } = useActivity();
  const saved = reads.includes('news');
  const [contentReady, setContentReady] = useState(false);
  usePageReady(contentReady);

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/feed')
      .then((data) => {
        if (!cancelled) setArticle(data.news || null);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!cancelled) setContentReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!contentReady) {
    return <Seo title={PAGE_SEO.news.title} description={PAGE_SEO.news.description} />;
  }

  const body = article?.body || article?.summary || article?.content || '';
  const newsTitle = article?.title
    ? `${article.title} | Industry News`
    : PAGE_SEO.news.title;
  const newsDescription = truncateMeta(body || PAGE_SEO.news.description);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Seo
        title={newsTitle}
        description={newsDescription}
        image={article?.image || undefined}
        type="article"
      />
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Industry News</h1>
      {!article ? (
        <p className="text-sm font-medium text-slate-500">No industry news yet.</p>
      ) : (
      <article className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {article.image && (
          <LoadingImage src={article.image} alt="" className="w-full h-64 object-cover" />
        )}
        <div className="p-8 space-y-4">
          {article.badge && (
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{article.badge}</span>
          )}
          <h2 className="text-2xl font-black text-slate-900">{article.title}</h2>
          {body && <p className="text-slate-600 leading-relaxed">{body}</p>}
          <button
            type="button"
            onClick={() => toggleArticle('news')}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm"
          >
            <ExternalLink size={16} />
            {saved ? 'Saved to your account' : 'Save article'}
          </button>
        </div>
      </article>
      )}
    </div>
  );
};
