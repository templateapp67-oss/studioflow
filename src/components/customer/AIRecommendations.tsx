import React,{useEffect,useState} from 'react';
import {Sparkles,Clock,Scissors,ArrowRight,RefreshCw} from 'lucide-react';
import {Salon,Booking,Service,menu,rupees} from './model';
import {DiscoveryPhoto} from './DiscoverySections';
import {barberServiceImage,BARBER_REFERENCE_IMAGES} from '../../lib/barberReference';

interface AIRecommendationsProps {
  salons: Salon[];
  favorites: string[];
  bookings: Booking[];
  open: (salon: Salon) => void;
  book: (salon: Salon, ids?: string[]) => void;
}

export function CustomerAIRecommendations({salons,favorites,bookings,open,book}:AIRecommendationsProps){
  const [items, setItems] = useState<Array<{salon: Salon; service: Service; aiReason: string}>>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const availableServices: Array<{salonSlug: string; serviceId: string; serviceName: string; category?: string; price: number}> = [];
      for(const s of salons) {
        if(s.demoTemplateId) continue;
        for(const sv of menu(s)) {
          availableServices.push({
            salonSlug: s.slug,
            serviceId: sv.id,
            serviceName: sv.name,
            category: sv.category,
            price: sv.price
          });
        }
      }

      const res = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          bookingHistory: bookings.map(b => ({
            status: b.status,
            date: b.payload?.date,
            serviceItems: b.payload?.serviceItems
          })),
          favorites,
          availableServices
        })
      });
      const data = await res.json();
      if(data && Array.isArray(data.recommendations)) {
        const resolved = data.recommendations.map((r: any) => {
          let targetSalon = salons.find(s => s.slug === r.salonSlug);
          if(!targetSalon && availableServices[r.index]) {
            targetSalon = salons.find(s => s.slug === availableServices[r.index].salonSlug);
          }
          if(!targetSalon && salons.length > 0) targetSalon = salons[0];
          if(!targetSalon) return null;

          const targetService = menu(targetSalon).find(sv => sv.id === r.serviceId) || menu(targetSalon)[r.index % Math.max(1, menu(targetSalon).length)];
          if(!targetService) return null;

          return {
            salon: targetSalon,
            service: targetService,
            aiReason: r.aiReason || 'Tailored to your recent salon activity and beauty preferences.'
          };
        }).filter(Boolean);

        if(resolved.length > 0) {
          setItems(resolved);
        } else {
          fallbackDefault();
        }
      } else {
        fallbackDefault();
      }
    } catch {
      fallbackDefault();
    } finally {
      setLoading(false);
    }
  };

  const fallbackDefault = () => {
    const defaultList: Array<{salon: Salon; service: Service; aiReason: string}> = [];
    for(const s of salons) {
      if(s.demoTemplateId) continue;
      for(const sv of menu(s).slice(0, 1)) {
        defaultList.push({
          salon: s,
          service: sv,
          aiReason: `Curated based on trending treatments at ${s.content.profile.businessName}.`
        });
      }
    }
    setItems(defaultList.slice(0, 4));
  };

  useEffect(() => {
    if(salons.length > 0) {
      void fetchRecommendations();
    }
  }, [salons.length, bookings.length]);

  if(items.length === 0 && !loading) return null;

  return (
    <section className="cr-recommendations cr-ai-recommendations">
      <div className="cr-row">
        <div className="cr-recommend-heading">
          <span className="cr-zip-heading-icon"><Sparkles size={18}/></span>
          <div>
            <h2>Recommended For You <span className="cr-label">AI PERSONALIZED</span></h2>
            <p>Smart service suggestions powered by Gemini based on your booking history & preferences</p>
          </div>
        </div>
        <button className="cr-icon cr-zip-refresh" aria-label="Refresh AI recommendations" disabled={loading} onClick={fetchRecommendations}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
        </button>
      </div>

      {loading ? (
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',padding:'40px',color:'#6b7280'}}>
          <Sparkles size={20} className="animate-pulse" style={{marginRight:'8px'}}/> Generating AI recommendations tailored for you…
        </div>
      ) : (
        <div className="cr-recommend-grid">
          {items.map(({salon, service, aiReason}, idx) => (
            <article className="cr-pick" key={salon.slug + service.id + idx}>
              <button className="cr-pick-photo" aria-label={`View ${service.name}`} onClick={()=>open(salon)}>
                <DiscoveryPhoto salon={salon} src={service.imageUrl || (salon.content.profile.businessType==='barber'?(/hair\s*cut/i.test(service.name)?BARBER_REFERENCE_IMAGES.fade:barberServiceImage(service.name)):undefined)} alt={service.name}/>
              </button>
              <div className="cr-row">
                <span className="cr-pick-tag">✨ AI MATCH</span>
                <span className="cr-minutes"><Clock size={12}/>{service.durationMinutes} mins</span>
              </div>
              <button className="cr-text-button" onClick={()=>open(salon)}>
                <h3>{service.name}</h3>
              </button>
              <button className="cr-pick-salon" onClick={()=>open(salon)}>
                <Scissors size={12}/>{salon.content.profile.businessName}
              </button>
              <div className="cr-pick-reason">
                <span><Sparkles size={13}/> {aiReason}</span>
              </div>
              <div className="cr-row cr-pick-price">
                <div>
                  <small>PRICE</small>
                  <b>{rupees(service.price)}</b>
                </div>
                <button className="cr-primary cr-tiny" onClick={()=>book(salon, [service.id])}>
                  Book Service <ArrowRight size={13}/>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
