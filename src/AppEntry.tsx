import React, { useEffect, useState } from "react";
import { loadSite } from "./lib/supabase"; // Updated path based on previous work

const DEFAULT_SLUG = "arch-flutter-demo"; 

function getSlug() {
  if (typeof window === 'undefined') return DEFAULT_SLUG;
  const p = new URLSearchParams(window.location.search).get("site");
  return p || localStorage.getItem("lastSite") || DEFAULT_SLUG;
}

// Placeholder for the actual Template component
const Template = ({ data }: { data: any }) => (
  <div style={{ padding: 40 }}>
    <h1>Template Loaded: {data.site.name}</h1>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
);

export default function Application() {
  const [slug] = useState(getSlug);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadSite(slug)
      .then((d) => { if (alive) { setData(d); localStorage.setItem("lastSite", slug); } })
      .catch((e) => { console.error("[loadSite]", e); if (alive) setError(e.message || String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  const badge = (
    <div style={{position:"fixed",bottom:8,left:8,zIndex:99999,background:"#000",color:"#0f0",
      font:"12px monospace",padding:"4px 8px",borderRadius:6}}>
      slug={slug} loading={String(loading)} data={data ? "yes" : "no"} err={error ? "yes" : "no"}
    </div>
  );

  if (loading) return <>{badge}<div style={{padding:40}}>Loading...</div></>;
  if (error)   return <>{badge}<div style={{padding:40, color: "#b00020"}}><pre>{error}</pre></div></>;
  if (!data)   return <>{badge}<div style={{padding:40}}>No site found for "{slug}"</div></>;

  return <>{badge}<Template data={data} /></>;
}
