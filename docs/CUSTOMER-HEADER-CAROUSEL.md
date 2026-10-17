# Five-image customer app header

Customer Home shows exactly five distinct images in a sliding carousel. Published promotion/cover and gallery images come first; remaining slides use existing category inspiration photographs with generic app copy. Generic inspiration never advertises a fake salon or offer, and its action opens the salon directory. Published salon slides open their actual salon.

Autoplay advances every four seconds, reverses at the fifth image and moves back to the first. It pauses for mouse hover, focus, touch interaction, a hidden browser tab and explicit Pause. Reduced-motion users start paused and have no transition animation. Previous/next, five dots, keyboard arrows and horizontal swipe are supported. Swipe does not activate the salon button. Offscreen slide controls are excluded from keyboard navigation. Favorites keeps its existing focused listing.

Validation: five distinct images even with no published salon; forward/reverse endpoints; autoplay, pause, manual arrows, keyboard, swipe and interval cleanup in component regression. Existing booking and customer profile suites, TypeScript, production build and PWA checks passed. No physical Android test claimed.
