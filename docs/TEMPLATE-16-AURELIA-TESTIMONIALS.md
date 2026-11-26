# Aurelia — unified customer testimonials

The Aurelia storefront now uses a single review-card grid. Empty records, demo records and seeded placeholder names such as `AURELIA GUEST 1` are excluded before the grid is built. Valid customer reviews are de-duplicated by ID and review text.

Each card shows five star icons, the review quote, a customer avatar when a profile image URL is present (or the first initial otherwise), the customer name, booked service, shared location, and the active salon/template brand name. Missing service/location data is labelled honestly instead of leaving blank tags or inventing a customer address.

The existing Aurelia ivory/coffee palette and responsive `.sf-aurelia-reviews-grid` are retained. No database migration or review-table change is needed.
