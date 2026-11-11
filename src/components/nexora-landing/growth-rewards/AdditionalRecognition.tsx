import { Info, ShieldCheck } from 'lucide-react';
import { RECOGNITION_CONDITION, RECOGNITION_ITEMS, RECOGNITION_NOTE } from './content';
import { RecognitionArt } from './RewardsArtwork';
import { SectionHeading } from './SectionHeading';

/**
 * Additional recognition. These items are not milestone rewards, so the
 * condition is stated before the tiles and the programme note closes the panel.
 */
export function AdditionalRecognition() {
  return (
    <section className="ngr-section ngr-recognition" aria-labelledby="ngr-recognition-title">
      <div className="ngr-container">
        <div className="ngr-panel">
          <SectionHeading
            id="ngr-recognition-title"
            eyebrow="Beyond the milestones"
            title="Additional Recognition"
            lead="Stand out with extra recognition and partner visibility."
          />
          <p className="ngr-flag">
            <ShieldCheck aria-hidden="true" /> {RECOGNITION_CONDITION}
          </p>
          <ul className="ngr-tiles">
            {RECOGNITION_ITEMS.map((item) => (
              <li className="ngr-tile" key={item.kind}>
                <div className="ngr-tile__art">
                  <RecognitionArt kind={item.kind} label={item.alt} />
                </div>
                <div className="ngr-tile__body">
                  <h3 className="ngr-tile__title">{item.title}</h3>
                  <p className="ngr-tile__text">{item.note}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="ngr-note ngr-note--panel">
            <Info aria-hidden="true" />
            <p>{RECOGNITION_NOTE}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
