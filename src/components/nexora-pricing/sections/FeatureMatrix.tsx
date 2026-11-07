import { ArrowRight, Check, CircleHelp, Minus } from 'lucide-react';
import { FEATURE_CATEGORIES, FEATURE_PLAN_ENTITLEMENTS, PRICING_PLANS } from '../../../lib/nexoraPricing';

export function FeatureMatrix() {
  return <section className="np-section np-matrix-section" id="comparison"><div className="np-container"><div className="np-section-heading"><span className="np-section-kicker">SIDE-BY-SIDE DETAILS</span><h2>Compare all features.</h2><p>Only plan inclusions explicitly confirmed in the approved pricing inputs are checked. Other plan assignments remain under review rather than being inferred from application code.</p></div>
    <div className="np-matrix-note"><CircleHelp size={18}/><span><b>Most tier assignments still need confirmation.</b> Standard explicitly includes WhatsApp API, attendance and advanced salon management. Other feature-by-plan combinations have not been approved.</span></div>
    <div className="np-matrix-wrap" role="region" aria-label="Feature comparison by plan. Scroll horizontally on small screens." tabIndex={0}><table className="np-matrix"><thead><tr><th scope="col">Feature</th>{PRICING_PLANS.map(p=><th scope="col" key={p.id}>{p.name}{p.popular&&<small>POPULAR</small>}</th>)}</tr></thead><tbody>{FEATURE_CATEGORIES.map(category=><FragmentCategory key={category.id} category={category}/>)}</tbody></table></div>
    <div className="np-mobile-scroll-hint"><ArrowRight size={15}/> Swipe to compare plan columns</div>
    <div className="np-legend"><span><Check size={15}/> Confirmed included</span><span><Minus size={15}/> Not included</span><span><CircleHelp size={15}/> Pending plan configuration</span></div>
  </div></section>;
}

export function FragmentCategory({category}:{category:typeof FEATURE_CATEGORIES[number]}) { return <>{<tr className="np-category-row"><th colSpan={5} scope="colgroup">{category.label}</th></tr>}{category.items.map(item=><tr key={item.id}><th scope="row"><span title={item.description}>{item.label}<span className="np-feature-help" title={item.description} tabIndex={0} aria-label={item.description}>i</span></span></th>{PRICING_PLANS.map(plan=>{const state=FEATURE_PLAN_ENTITLEMENTS[item.id][plan.id];return <td key={plan.id} aria-label={`${plan.name}: ${state==='review'?'pending plan confirmation':state}`} title={item.description}>{state==='included'?<Check className="matrix-yes" size={18}/>:state==='excluded'?<Minus className="matrix-no" size={17}/>:<span className="matrix-review"><CircleHelp size={15}/><small>Review</small></span>}</td>;})}</tr>)}</>; }
