import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { AsyncState, Picture, Reveal, SectionHeading, SectionIntro } from '../components/UI';
import { useSite } from '../hooks/useSite';
import { dateIST } from '../lib/format';
import type { Section } from '../types';
export function Blog({ section }: { section: Section }) {
  const { site } = useSite(); const posts = [...site.blog_posts].sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')).slice(0, 3);
  return <section id="blog" className="section-space"><div className="container-shell"><Reveal className="section-topline"><SectionHeading section={section} /><SectionIntro section={section} /></Reveal><AsyncState loading={false} empty={!posts.length} label="journal articles"><div className="blog-grid">{posts.map((post, index) => <Reveal key={post.id} delay={index * .08}><article className="blog-card"><Link to={`/blog/${post.slug}`} className="blog-image-link" tabIndex={-1} aria-hidden="true"><Picture src={post.cover_url} alt={post.cover_alt || post.title} width={800} height={580} sizes="(max-width: 767px) 90vw, 33vw" /></Link><div className="blog-meta"><span>EVERYDAY AYURVEDA</span><span>{post.published_at ? dateIST(post.published_at).split(',').slice(0, 2).join(',') : 'From the journal'}</span></div><h3><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3><p>{post.excerpt}</p><Link to={`/blog/${post.slug}`} className="text-link">Read the story<ArrowUpRight size={17} /></Link></article></Reveal>)}</div></AsyncState></div></section>;
}
