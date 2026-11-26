import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Minus, Plus, ArrowUpRight } from 'lucide-react';
import { PRICING_FAQS } from '../../../lib/nexoraPricing';

export function FAQ() {
  const [open,setOpen]=useState<number|null>(0);
  const reduceMotion=useReducedMotion();
  return <section className="np-section np-faq" id="faq"><div className="np-container np-faq-grid"><div className="np-faq-intro"><span className="np-section-kicker">GOOD TO KNOW</span><h2>Frequently Asked Questions.</h2><p>Answers are limited to the product and commercial settings currently confirmed.</p><a href="#plans">Back to plans <ArrowUpRight size={15}/></a></div><div className="np-faq-list">{PRICING_FAQS.map(([question,answer],i)=><div className={`np-faq-item ${open===i?'open':''}`} key={question}><h3><button type="button" aria-expanded={open===i} aria-controls={`np-faq-${i}`} onClick={()=>setOpen(open===i?null:i)}>{question}<span>{open===i?<Minus size={17}/>:<Plus size={17}/>}</span></button></h3><AnimatePresence initial={false}>{open===i&&<motion.div id={`np-faq-${i}`} className="np-faq-answer" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduceMotion?0:.2}}><p>{answer}</p></motion.div>}</AnimatePresence></div>)}</div></div></section>;
}
