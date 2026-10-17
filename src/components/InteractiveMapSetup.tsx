import {loadLeaflet} from '../lib/loadLeaflet';
import React, { useEffect, useRef, useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Maximize2, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Compass,
  Check
} from 'lucide-react';
import { SalonProfile } from '../types';

interface InteractiveMapSetupProps {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  themePrimaryColor?: string;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

export const InteractiveMapSetup: React.FC<InteractiveMapSetupProps> = ({
  profile,
  setProfile,
  themePrimaryColor = '#0f172a'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const latestProfile = useRef(profile);latestProfile.current = profile;
  const [pinConfirmed, setPinConfirmed] = useState<boolean>(Number.isFinite(profile.latitude)&&Number.isFinite(profile.longitude));
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pinValidationMsg, setPinValidationMsg] = useState<string>('');

  // Address construct helper
  const constructFullAddress = (
    shop: string,
    locality: string,
    land: string,
    c: string,
    st: string,
    pin: string
  ) => {
    const parts = [];
    if (shop.trim()) parts.push(shop.trim());
    if (locality.trim()) parts.push(locality.trim());
    if (land.trim()) {
      const cleanLand = land.trim().replace(/^near\s+/i, '');
      parts.push(`Near ${cleanLand}`);
    }
    if (c.trim()) parts.push(c.trim());
    if (st.trim()) parts.push(st.trim());
    
    let base = parts.join(', ');
    if (pin.trim()) {
      base += ` - ${pin.trim()}`;
    }
    return base;
  };

  // The parent profile is the only address source. Do not mirror it through
  // competing effects: multiple editors can be mounted in the template preview.
  const shopFlatNo = profile.shopFlatNo || '';
  const areaLocality = profile.areaLocality || '';
  const city = profile.city || '';
  const state = profile.state || '';
  const pincode = profile.postalCode || '';
  const landmark = profile.landmark || '';
  const fullAddress = profile.address || '';
  const patchAddress = (patch: Partial<SalonProfile>) => {
    setProfile(prev => Object.entries(patch).every(([key, value]) => prev[key] === value) ? prev : {...prev, ...patch});
  };
  const setShopFlatNo = (value: string) => patchAddress({shopFlatNo: value});
  const setAreaLocality = (value: string) => patchAddress({areaLocality: value});
  const setCity = (value: string) => patchAddress({city: value});
  const setState = (value: string) => patchAddress({state: value});
  const setPincode = (value: string) => patchAddress({postalCode: value});
  const setLandmark = (value: string) => patchAddress({landmark: value});
  const setFullAddress = (value: string) => patchAddress({address: value});
  const isValidPin = /^\d{6}$/.test(pincode);
  const [mapError, setMapError] = useState('');
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    loadLeaflet().then(() => { if (active) initializeMap(); }).catch(() => {
      if (active) setMapError('Map could not load. Your address can still be edited and saved.');
    });
    return () => {
      active = false;
      requestRef.current?.abort();
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lat=profile.latitude, lng=profile.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      markerInstanceRef.current?.setLatLng([lat,lng]);
      mapInstanceRef.current?.panTo([lat,lng]);
      setPinConfirmed(true);
    } else setPinConfirmed(false);
  }, [profile.latitude, profile.longitude]);
  useEffect(() => {
    const frame=requestAnimationFrame(()=>mapInstanceRef.current?.invalidateSize());
    return ()=>cancelAnimationFrame(frame);
  }, [isFullscreen]);

  const initializeMap = () => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapInstanceRef.current) return;

    // Default to Mumbai center if no coordinates
    const lat = latestProfile.current.latitude ?? 19.0760;
    const lng = latestProfile.current.longitude ?? 72.8777;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false // custom controls rendered in UI
    }).setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Dynamic marker
    const marker = L.marker([lat, lng], {
      draggable: true
    }).addTo(map);

    marker.on('dragend', () => {
      setIsSearching(false);
      const position = marker.getLatLng();
      setProfile(prev => ({
        ...prev,
        latitude: position.lat,
        longitude: position.lng
      }));
      setPinConfirmed(true);
      
      requestRef.current?.abort();
      const controller=new AbortController();requestRef.current=controller;
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`, {signal:controller.signal})
        .then(res => { if(!res.ok)throw new Error('Location lookup failed');return res.json(); })
        .then(data => {
          if(controller.signal.aborted || !data?.address)return;
          const addr=data.address;
          setProfile(prev => {
            const next={...prev,
              areaLocality:addr.suburb||addr.neighbourhood||prev.areaLocality||'',
              city:addr.city||addr.town||addr.village||prev.city||'',
              state:INDIAN_STATES.find(st=>st.toLowerCase()===addr.state?.toLowerCase())||prev.state||'',
              postalCode:addr.postcode?.substring(0,6)||prev.postalCode||''};
            return {...next,address:constructFullAddress(next.shopFlatNo||'',next.areaLocality,next.landmark||'',next.city,next.state,next.postalCode)};
          });
        }).catch(() => {});
    });

    mapInstanceRef.current = map;
    markerInstanceRef.current = marker;
  };

  // Zoom control helpers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  // Geocode address via Nominatim OpenStreetMap API
  const handleLocateAddress = async () => {
    const query = fullAddress || `${shopFlatNo} ${areaLocality} ${city} ${state} ${pincode}`;
    if (!query.trim()) return;

    if(isSearching)return;
    requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;
    setIsSearching(true);setMapError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + ', India')}`, {signal:controller.signal}
      );
      if(!response.ok)throw new Error('Address lookup is temporarily unavailable. Try again or place the pin manually.');
      const data = await response.json();
      if(controller.signal.aborted)return;
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        setProfile((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon
        }));

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 16);
          markerInstanceRef.current.setLatLng([lat, lon]);
        }
        setPinConfirmed(true);
      } else {
        setMapError('Could not locate this address. Check the address or drag the pin manually.');
      }
    } catch (err) {
      if(!controller.signal.aborted)setMapError(err instanceof Error?err.message:'Location lookup failed. Please try again.');
    } finally {
      if(!controller.signal.aborted)setIsSearching(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-1">
      {/* 1. Business Address Form Section */}
      <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg text-slate-500">storefront</span>
            Salon Address & Localization Setup
          </h3>
          <p className="text-[11px] text-slate-500">Add detailed location inputs to guide clients right to your salon doors.</p>
        </div>

        {/* Full Address Multi-line Area */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Full Business Address (Public Display)
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="e.g. Shop No. 5, Indiranagar Double Road, Opp. Metro Pillar 42, Bengaluru, Karnataka - 560038"
              className="w-full p-2.5 bg-slate-50 hover:bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all leading-normal"
            />
            <button
              type="button"
              onClick={handleLocateAddress}
              disabled={isSearching}
              className="absolute right-2 bottom-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Compass className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'Locating...' : 'Auto-Locate Pin'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Shop/Flat No. */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Shop / Flat / Suite No.
            </label>
            <input
              type="text"
              value={shopFlatNo}
              onChange={(e) => {
                const val = e.target.value;
                setShopFlatNo(val);
                setFullAddress(constructFullAddress(val, areaLocality, landmark, city, state, pincode));
              }}
              placeholder="e.g. Suite 104, Ground Floor"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>

          {/* Area/Locality */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Area / Locality / Sector
            </label>
            <input
              type="text"
              value={areaLocality}
              onChange={(e) => {
                const val = e.target.value;
                setAreaLocality(val);
                setFullAddress(constructFullAddress(shopFlatNo, val, landmark, city, state, pincode));
              }}
              placeholder="e.g. Indiranagar Sector 2"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* City */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                const val = e.target.value;
                setCity(val);
                setFullAddress(constructFullAddress(shopFlatNo, areaLocality, landmark, val, state, pincode));
              }}
              placeholder="Bengaluru"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>

          {/* State Dropdown */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              State
            </label>
            <select
              value={state}
              onChange={(e) => {
                const val = e.target.value;
                setState(val);
                setFullAddress(constructFullAddress(shopFlatNo, areaLocality, landmark, city, val, pincode));
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-900 focus:outline-none"
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* PIN Code Field */}
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                PIN Code
              </label>
              {isValidPin && (
                <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5 animate-fade-in bg-emerald-50 px-1 py-0.2 rounded-md">
                  <Check className="w-2.5 h-2.5" />
                  <span>Valid PIN</span>
                </span>
              )}
            </div>
            <input
              type="text"
              maxLength={6}
              value={pincode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPincode(val);
                setFullAddress(constructFullAddress(shopFlatNo, areaLocality, landmark, city, state, val));
              }}
              placeholder="560038"
              className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none ${
                isValidPin ? 'border-emerald-200 focus:border-emerald-500' : 'border-slate-200 focus:border-slate-900'
              }`}
            />
          </div>
        </div>

        {/* Landmark Field */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Landmark <span className="text-slate-400 lowercase italic">(Optional)</span>
          </label>
          <input
            type="text"
            value={landmark}
            onChange={(e) => {
              const val = e.target.value;
              setLandmark(val);
              setFullAddress(constructFullAddress(shopFlatNo, areaLocality, val, city, state, pincode));
            }}
            placeholder="e.g. Behind Metro Station or Near Starbucks"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleLocateAddress}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm mt-2"
        >
          <MapPin className="w-4 h-4" />
          <span>Confirm Address & Place Marker Pin</span>
        </button>
      </div>

      {mapError && <p role="alert" className="text-sm text-amber-800 lg:col-span-12">{mapError}</p>}

      {/* 2. Interactive Live Map Preview Section */}
      <div className={`lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between ${isFullscreen ? 'fixed inset-4 z-[999] shadow-2xl' : 'relative'}`}>
        <div className="space-y-3 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-slate-900">Map Live Location</span>
                {pinConfirmed ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Confirmed
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5 animate-bounce" />
                    Needs Location
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {profile.businessName || 'Your salon'} studio pin on customer map
              </p>
            </div>

            {/* Map Toolbar Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleLocateAddress}
                title="Refresh Map Coordinates"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <Compass className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title="Toggle Fullscreen Map View"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Leaflet Map Frame Wrapper */}
          <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 h-[220px] lg:h-full min-h-[220px] flex-1">
            <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full" />
            
            {/* Real Zoom Controls overlay */}
            <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1">
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-7 h-7 bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base rounded-lg border border-slate-200 shadow-md flex items-center justify-center cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-7 h-7 bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base rounded-lg border border-slate-200 shadow-md flex items-center justify-center cursor-pointer"
              >
                -
              </button>
            </div>

            {/* Draggable notice card */}
            <div className="absolute left-3 top-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2 shadow-sm text-[9px] font-bold text-slate-700 flex items-center gap-1.5 max-w-[190px]">
              <Navigation className="w-3.5 h-3.5 text-blue-600 rotate-45" />
              <span>Drag pin directly on map to fine-tune placement</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-medium italic mt-2 text-center">
            Use Auto-Locate Pin after editing the address, or drag the marker to place it.
          </p>
        </div>
      </div>
    </div>
  );
};
