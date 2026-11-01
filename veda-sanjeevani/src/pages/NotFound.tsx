import { Seo } from '../components/Seo';
import { ButtonLink, Eyebrow } from '../components/UI';
import { Mandala } from '../components/Artwork';
export default function NotFound() { return <><Seo title="A little off the path" description="This page could not be found. Return to Veda Sanjeevani." path="/404" noindex /><div className="container-shell narrow-page not-found page-enter"><Mandala className="not-found-mandala" /><Eyebrow>404 · A SMALL DETOUR</Eyebrow><h1 tabIndex={-1}>A little off<br />the beaten path.</h1><p className="page-lead">This page isn’t here, but a moment of calm still is.<br />Let’s find your way back.</p><ButtonLink to="/">Return to the sanctuary</ButtonLink></div></>; }
