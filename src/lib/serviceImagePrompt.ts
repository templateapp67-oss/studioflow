import {SERVICE_PHOTOGRAPHY_PLAYBOOKS, servicePhotographyDirection} from './servicePhotography';

// A local creative-brief identifier; no customer identity or server request is needed.
export function createServiceImageVariation(){
 if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
 if(globalThis.crypto?.getRandomValues)return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-');
 return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
const DIRECTIONS={
 camera:['three-quarter view at workstation height','gentle overhead diagonal focused on the treatment','close side profile of the treatment area','medium view from across the workstation','tight detail with a softly blurred studio behind','slightly elevated view with asymmetric framing','low diagonal detail at tool level','over-the-shoulder view with the service clearly visible'],
 light:['soft north-window daylight','warm bounced afternoon light','diffused cool morning light','gentle studio softbox light','warm side lighting with soft shadows','bright airy daylight softened by sheer curtains','balanced neutral editorial lighting','soft rim lighting with a gentle frontal fill'],
 decor:['warm oak and ivory linen','muted sage and brushed brass','soft rose and matte cream','charcoal stone and pale wood','terracotta and warm neutral textiles','powder blue and natural bamboo','plum accents and soft beige','sandstone and warm copper'],
 composition:['subject on the center-right with soft foreground depth','centered treatment detail with layered background depth','diagonal tool arrangement beside the treatment','asymmetric composition with an uncluttered left side','treatment framed by a curved workstation edge','clean minimal composition with tactile background detail','editorial framing with soft bokeh highlights','balanced close composition emphasizing authentic technique']
};
function creativeDirections(variation:string){
 let seed=2166136261;
 for(const char of variation)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
 const random=()=>{seed=(seed+0x6d2b79f5)>>>0;let value=seed;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return ((value^(value>>>14))>>>0)/4294967296;};
 const pick=(values:readonly string[])=>{const pool=[...values];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,3);};
 const camera=pick(DIRECTIONS.camera),light=pick(DIRECTIONS.light),decor=pick(DIRECTIONS.decor),composition=pick(DIRECTIONS.composition);
 return Array.from({length:3},(_,i)=>`Image ${i+1}: Camera: ${camera[i]}. Lighting: ${light[i]}. Studio palette/materials: ${decor[i]}. Composition: ${composition[i]}.`).join('\n');
}

/**
 * The category photography playbook shown inside every service photo brief.
 * `businessType` is optional so older callers (and the two-argument smoke tests)
 * keep working: without it the playbook is inferred from the category/service
 * wording, defaulting to the haircut studio playbook.
 */
function inferredBusinessType(name:string,category:string){
 const text=`${category} ${name}`.toLowerCase();
 if(/tattoo|ink\b/.test(text))return 'tattoo_studio';
 if(/lash|brow|thread/.test(text))return 'lash_brow';
 if(/nail|manicure|pedicure/.test(text))return 'nail_studio';
 if(/bridal|mehendi|mehndi|drap/.test(text))return 'bridal_lounge';
 if(/shirodhara|abhyanga|ayurved|potli|panchakarma/.test(text))return 'ayurvedic_spa';
 if(/massage|body ritual/.test(text))return 'massage_wellness';
 if(/wax/.test(text)||/beauty parlour|parlour/.test(text))return 'beauty_parlour';
 if(/facial|skin|derma|clinic|led/.test(text))return 'skincare_clinic';
 if(/makeup|make-up/.test(text))return 'makeup_studio';
 if(/keratin|hair spa|scalp|smoothening/.test(text))return 'hair_spa';
 if(/balayage|colour|color|highlight|gloss/.test(text))return 'hair_coloring';
 if(/beard|fade|barber/.test(text))return 'barber';
 return 'hair_salon';
}

function playbookSection(businessType:string|undefined,name:string,category:string){
 const resolved=businessType&&SERVICE_PHOTOGRAPHY_PLAYBOOKS[businessType as keyof typeof SERVICE_PHOTOGRAPHY_PLAYBOOKS]?businessType:inferredBusinessType(name,category);
 const {playbook,techniqueHint}=servicePhotographyDirection(resolved,name,category);
 return `CATEGORY PHOTOGRAPHY PLAYBOOK — ${playbook.templateName}
Business category: ${resolved}
Photography direction: ${playbook.categoryLabel}
Accurate tools (show only these, and only those genuinely used by the selected service): ${playbook.tools.join('; ')}
Authentic technique: ${playbook.techniques.join('; ')}${techniqueHint?`
Service-specific technique for this brief: ${techniqueHint}`:''}
Studio palette and textures: ${playbook.palette.join('; ')}
Setting: ${playbook.setting.join('; ')}
Subject styling: ${playbook.styling}
Never show for this category: ${playbook.avoid.join('; ')}`;
}

export function serviceImagePrompt(name:string,category:string,description:string,variation=createServiceImageVariation(),businessType?:string){
 return `FRESH CREATIVE BRIEF
Brief reference: ${variation} (for tracking only; do not render this identifier in the image; it is not an image-model seed).
${creativeDirections(variation)}

Create 3 original, separate professional images for a salon service website. Generate each as its own image, not a collage, grid or contact sheet.

SERVICE DETAILS
Service name: ${name.trim()}
Category: ${category.trim()}
Service description: ${description.trim()}

${playbookSection(businessType,name,category)}

Show the specific service described above, with realistic tools, technique and natural detail. Use a clean, premium Indian salon or wellness studio setting. Use adult subjects only, fully clothed where people appear, with respectful, non-sexual treatment framing. Do not depict unrelated services. Every tool, product and hand position must match the category playbook above; never borrow tools from a different salon category.
Use these distinct visual directions for three genuinely different scenes, not the same photograph recolored or slightly cropped. Invent fresh decor, adult subjects where suitable, tool placement and framing for this brief; do not reuse a previous image composition. Keep the exact selected service, category and description unchanged. Camera and decor choices must adapt to the actual treatment, using only appropriate tools and safe, authentic technique. If a direction conflicts with service accuracy, preserve service accuracy.
Generate directly from this text; no reference upload is needed.

For every image: landscape 3:2 aspect ratio (ideally 1536 × 1024 px), sharp professional photographic style, clean editorial lighting (soft north-window daylight or balanced neutral studio lighting), rich texture (sandstone, warm copper, soft rose, matte cream), main subject safely inside the central area for card cropping with at least 12% margin from every edge. No unrelated text, third-party brand names, third-party logos, stock watermarks, price tags, before-and-after comparison or guaranteed medical claims. Do not reuse existing website photographs.

MANDATORY NEXORA BRANDING: Every image must include a clearly visible, legible wordmark spelled exactly "Nexora". Integrate it tastefully on a salon wall sign, towel, stylist apron or a small clean footer wordmark. Keep Nexora branding inside the central safe-crop area, with at least 12% margin from the image edges; do not cover faces, hands or the service being performed. Use consistent premium styling across all three images. Do not omit Nexora branding from any variation.

Provide downloadable JPG or PNG images. If you can only create one at a time, create Image 1 first and let me ask for Images 2 and 3 separately.`;
}
