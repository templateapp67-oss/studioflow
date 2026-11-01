import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { ArrowLeft } from 'lucide-react';
import { useSite } from '../hooks/useSite';
import { Seo } from '../components/Seo';
import { AsyncState, Eyebrow, Picture, Reveal } from '../components/UI';
import { loadBlog } from '../lib/api';
import { dateIST, MEDICAL_DISCLAIMER } from '../lib/format';
import NotFound from './NotFound';
export default function BlogPage() {
  const { slug = '' } = useParams(); const { env, source } = useSite();
  const query = useQuery({ queryKey: ['blog', slug, source], queryFn: () => loadBlog(env, slug, source), retry: false });
  if (query.data === null) return <NotFound />;
  const post = query.data;
  return <><Seo title={post?.title ?? 'The wellness journal'} description={post?.excerpt} path={`/blog/${slug}`} image={post?.cover_url} /><article className="container-shell article-page page-enter"><Link to="/#blog" className="text-link breadcrumb"><ArrowLeft size={16} />The wellness journal</Link><AsyncState loading={query.isPending} error={query.isError ? 'We couldn’t load this story. Please try again.' : null} onRetry={() => void query.refetch()} label="article">{post && <><header className="article-header"><Eyebrow>EVERYDAY AYURVEDA</Eyebrow><h1 tabIndex={-1}>{post.title}</h1><p>{post.excerpt}</p><span className="article-date">{post.published_at ? dateIST(post.published_at) : 'From the journal'} · A moment to read</span></header><Picture src={post.cover_url} alt={post.cover_alt || post.title} className="article-cover" width={1200} height={700} eager /><Reveal className="article-body"><div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body, { ALLOWED_TAGS: ['p', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'a', 'br', 'hr', 'code'], ALLOWED_ATTR: ['href', 'title'], FORBID_ATTR: ['style'] }) }} /><aside className="article-note">{MEDICAL_DISCLAIMER} This article is educational, not personalised medical advice.</aside></Reveal></>}</AsyncState></article></>;
}
