type DescriptionStyle={simple:string;premium:string;friendly:string};
const styles:Array<{match:RegExp;copy:DescriptionStyle}>=[
 {match:/package|combo|bundle|ritual/,copy:{simple:'A thoughtfully combined salon experience for your self-care routine.',premium:'Enjoy a curated combination of services in one considered salon visit.',friendly:'Make time for yourself with a convenient combination of salon favourites.'}},
 {match:/hair\s*cut|haircut|precision cut|scissor|layered cut|fade|trim/,copy:{simple:'A tailored cut to suit your style and everyday routine.',premium:'Refresh your look with considered shaping and a polished finish.',friendly:'Find your next favourite look with a cut shaped around you.'}},
 {match:/beard|shav|groom/,copy:{simple:'Detailed grooming for a neat, well-defined look.',premium:'Refine your personal style with attentive shaping and finishing.',friendly:'Freshen up your look with grooming tailored to your preferences.'}},
 {match:/colou?r|balayage|highlight|root touch/,copy:{simple:'A colour refresh tailored to your preferred look.',premium:'Explore a considered colour finish with guidance on your chosen shade.',friendly:'Bring a fresh touch of colour to your style.'}},
 {match:/keratin|botox|smoothing|blow.?dry|hair styling|hair spa|scalp/,copy:{simple:'Hair care and styling tailored to your preferred finish.',premium:'Enjoy attentive hair care for a polished, considered salon look.',friendly:'Give your hair some care and refresh your everyday style.'}},
 {match:/thread|brow/,copy:{simple:'Careful shaping to complement your natural features.',premium:'Define your look with attentive shaping and a refined finish.',friendly:'Refresh your brows and enjoy a neatly shaped look.'}},
 {match:/lash/,copy:{simple:'Lash styling tailored to your preferred look.',premium:'Frame your eyes with a considered lash finish.',friendly:'Choose a lash look that feels like you.'}},
 {match:/wax|hair removal/,copy:{simple:'A personal-care session focused on your chosen area.',premium:'Enjoy attentive hair-removal care in a considered salon setting.',friendly:'Keep your care routine simple with a tailored waxing session.'}},
 {match:/facial|skin|bleach|d.?tan|peel|glow/,copy:{simple:'A skin-care session tailored to your care preferences.',premium:'Take time for attentive skin care and a refreshing salon experience.',friendly:'Enjoy a little self-care with a refreshing skin-care session.'}},
 {match:/nail|manicure|pedicure/,copy:{simple:'Nail care and finishing tailored to your style.',premium:'Complete your look with attentive nail care and a polished finish.',friendly:'Treat yourself to nail care with a finish you love.'}},
 {match:/bridal|make.?up/,copy:{simple:'A makeup look tailored to your style and occasion.',premium:'Create a considered occasion look with attentive makeup artistry.',friendly:'Feel ready for your occasion with a look made for you.'}},
 {match:/tattoo|ink|piercing/,copy:{simple:'A personal studio session to discuss your chosen design and placement.',premium:'Explore your individual style through a considered studio consultation.',friendly:'Bring your idea and discuss a look that feels personal to you.'}},
 {match:/massage|spa|therapy|therapist|ayurved|wellness/,copy:{simple:'A relaxing care session tailored to your preferences.',premium:'Pause for an attentive wellness experience in a calm setting.',friendly:'Take a little time out for relaxation and personal care.'}},
];
const fallback:DescriptionStyle={simple:'Personalised care tailored to your preferences.',premium:'Enjoy attentive service and a considered finish.',friendly:'Make time for yourself with care shaped around you.'};
export function serviceDescriptionSuggestions(name:string,category:string):Array<{label:string;text:string}>{
 const title=name.replace(/\s+/g,' ').trim().slice(0,160);
 if(!title)return [];
 // A specific name takes priority over a broad category (e.g. Hair cut / Hair Styling).
 const copy=styles.find(item=>item.match.test(title.toLowerCase()))?.copy||styles.find(item=>item.match.test(category.toLowerCase()))?.copy||fallback;
 return (['simple','premium','friendly'] as const).map(key=>({label:key[0].toUpperCase()+key.slice(1),text:`${title}: ${copy[key]}`}));
}
