import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, Expand } from 'lucide-react';
import { AsyncState, Picture, Reveal, SectionHeading } from '../components/UI';
import { Dialog } from '../components/Dialog';
import { useSite } from '../hooks/useSite';
import type { Section } from '../types';
export function Gallery({ section }: { section: Section }) {
  const { site } = useSite(); const [selected, setSelected] = useState<number | null>(null); const images = site.gallery;
  const close = useCallback(() => setSelected(null), []);
  const move = useCallback((direction: number) => setSelected((current) => current === null ? null : (current + direction + images.length) % images.length), [images.length]);
  const image = selected === null ? null : images[selected];
  return <section id="gallery" className="section-space bg-sandal/45"><div className="container-shell"><Reveal className="text-center"><SectionHeading section={section} align="center" /></Reveal><AsyncState loading={false} empty={!images.length} label="gallery images"><div className="masonry-gallery">{images.map((item, index) => <Reveal key={item.id} delay={(index % 3) * .05}><button className={`gallery-tile gallery-tile-${index}`} onClick={() => setSelected(index)} aria-label={`Open image ${index + 1}: ${item.image_alt || item.caption}`}><Picture src={item.image_url} alt={item.image_alt || item.caption} width={800} height={index % 3 === 0 ? 1000 : 650} sizes="(max-width: 640px) 90vw, 33vw" /><span className="gallery-caption"><span>{item.caption}</span><Expand size={18} /></span></button></Reveal>)}</div></AsyncState></div><Dialog open={!!image} onClose={close} title="Gallery image" className="lightbox"><div onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } }}>{image && <><Picture src={image.image_url} alt={image.image_alt || image.caption} className="lightbox-image" width={1200} height={900} eager /><div className="lightbox-caption"><p>{image.caption}</p><span>{(selected ?? 0) + 1} / {images.length}</span></div><div className="lightbox-controls"><button className="icon-btn" onClick={() => move(-1)} aria-label="Previous image"><ArrowLeft /></button><span>Use arrow keys to explore · Esc to close</span><button className="icon-btn" onClick={() => move(1)} aria-label="Next image"><ArrowRight /></button></div></>}</div></Dialog></section>;
}
