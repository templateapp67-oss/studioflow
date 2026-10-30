import React from "react";
import "../ironInk.css";
import type { SalonProfile } from "../../types";
import { IRON_INK_CATEGORIES, ironInkDefaults, ironInkDurationMinutes } from "../../lib/ironInk";

export function IronInkEditor({
  profile,
  setProfile,
  services,
  setServices,
}: {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services?: import("../../types").SalonService[];
  setServices?: React.Dispatch<
    React.SetStateAction<import("../../types").SalonService[]>
  >;
}) {
  const config = profile.ironInk || {};
  const savedCategories = config.categories || [];
  const categories = [
    ...IRON_INK_CATEGORIES.map(
      (category) => savedCategories.find((saved) => saved.slug === category.slug) || category,
    ),
    ...savedCategories.filter(
      (saved) => !IRON_INK_CATEGORIES.some((category) => category.slug === saved.slug),
    ),
  ];
  const patch = (value: Partial<NonNullable<SalonProfile["ironInk"]>>) =>
    setProfile((previous) => ({
      ...previous,
      ironInk: { ...previous.ironInk, ...value },
    }));
  const updateCategory = (
    slug: string,
    key: "enabled" | "price" | "image" | "description" | "duration",
    value: boolean | number | string,
  ) => {
    const target = categories.find((category) => category.slug === slug);
    patch({
      categories: categories.map((category) =>
        category.slug === slug ? { ...category, [key]: value } : category,
      ),
    });
    if (target && setServices && key !== "enabled")
      setServices((current) =>
        current.map((service) =>
          service.id === `ii-${slug}` || service.category === target.name
            ? {
                ...service,
                ...(key === "price"
                  ? { price: Number(value) }
                  : key === "duration"
                    ? {
                        durationMinutes: ironInkDurationMinutes(String(value)),
                      }
                    : key === "image"
                      ? { imageUrl: String(value) }
                      : { description: String(value) }),
              }
            : service,
        ),
      );
  };
  const updateFaq = (
    index: number,
    key: "question" | "answer",
    value: string,
  ) =>
    patch({
      faq: (config.faq || ironInkDefaults.faq).map((faq, i) =>
        i === index ? { ...faq, [key]: value } : faq,
      ),
    });
  const testimonials = (profile.websiteTestimonials || []).filter((item) => !item.isDemo);
  const updateTestimonial = (
    id: string,
    key: "name" | "comment" | "avatarUrl",
    value: string,
  ) =>
    setProfile((previous) => ({
      ...previous,
      websiteTestimonials: (previous.websiteTestimonials || []).map((item) =>
        item.id === id ? { ...item, [key]: value, isDemo: false } : item,
      ),
    }));
  const addTestimonial = () =>
    setProfile((previous) => {
      const current = previous.websiteTestimonials || [];
      if (current.length >= 6) return previous;
      return {
        ...previous,
        websiteTestimonials: [...current, {
          id: `ii-review-${Date.now()}`,
          name: "",
          location: "",
          rating: 5,
          serviceName: "",
          comment: "",
          avatarUrl: "",
          date: "",
        }],
      };
    });
  const removeTestimonial = (index: number) =>
    setProfile((previous) => ({
      ...previous,
      websiteTestimonials: (previous.websiteTestimonials || []).filter((item) => item.id !== testimonials[index]?.id),
    }));
  return (
    <section className="ii-editor" aria-label="Template 12 content settings">
      <div className="ii-editor-head">
        <span className="ii-kicker">TEMPLATE 12 · IRON & INK</span>
        <h2>Shape your studio site</h2>
        <p>
          All 30 tattoo and body-art categories start enabled with a starting
          price, session duration and detailed description. Customize them here;
          your existing profile, artists and gallery are used automatically.
        </p>
      </div>
      <div className="ii-editor-grid">
        <label>
          Hero image URL
          <input
            value={config.heroImage || ""}
            placeholder={ironInkDefaults.heroImage}
            onChange={(e) => patch({ heroImage: e.target.value })}
          />
        </label>
        <label>
          Studio interior image URL
          <input
            value={config.interiorImage || ""}
            placeholder={ironInkDefaults.interiorImage}
            onChange={(e) => patch({ interiorImage: e.target.value })}
          />
        </label>
        <label>
          Booking deposit (₹)
          <input
            type="number"
            min="0"
            value={config.bookingDeposit ?? ironInkDefaults.bookingDeposit}
            onChange={(e) => patch({ bookingDeposit: Number(e.target.value) })}
          />
        </label>
      </div>
      <h3>
        30 styles & body-art services{" "}
        <small>Enable, price, duration, description and image</small>
      </h3>
      <div className="ii-category-settings">
        {categories.map((item) => (
          <article className="ii-category-setting" key={item.slug}>
            <label className="ii-enable">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) =>
                  updateCategory(item.slug, "enabled", e.target.checked)
                }
              />
              <span>{item.name}</span>
            </label>
            <label>
              Starting at ₹
              <input
                type="number"
                min="0"
                value={item.price}
                onChange={(e) =>
                  updateCategory(item.slug, "price", Number(e.target.value))
                }
              />
            </label>
            <label>
              Duration
              <input
                value={item.duration}
                onChange={(e) =>
                  updateCategory(item.slug, "duration", e.target.value)
                }
              />
            </label>
            <label>
              Service description
              <textarea
                rows={3}
                value={item.description}
                onChange={(e) =>
                  updateCategory(item.slug, "description", e.target.value)
                }
              />
            </label>
            <label>
              Image URL
              <input
                value={item.image}
                onChange={(e) =>
                  updateCategory(item.slug, "image", e.target.value)
                }
              />
            </label>
          </article>
        ))}
      </div>
      <h3>Frequently asked questions</h3>
      {(config.faq || ironInkDefaults.faq).map((faq, index) => (
        <div className="ii-faq-edit" key={index}>
          <input
            aria-label={`FAQ ${index + 1} question`}
            value={faq.question}
            onChange={(e) => updateFaq(index, "question", e.target.value)}
          />
          <textarea
            aria-label={`FAQ ${index + 1} answer`}
            value={faq.answer}
            onChange={(e) => updateFaq(index, "answer", e.target.value)}
          />
        </div>
      ))}
      <h3>Client testimonials</h3>
      <p>Add only reviews you have permission to publish. Empty reviews are not shown on the storefront.</p>
      {testimonials.slice(0, 6).map((item, index) => (
        <div className="ii-testimonial-edit" key={item.id}>
          <input
            aria-label={`Testimonial ${index + 1} client name`}
            value={item.name}
            onChange={(e) => updateTestimonial(item.id, "name", e.target.value)}
          />
          <input
            aria-label={`Testimonial ${index + 1} client photo URL`}
            value={item.avatarUrl || ""}
            placeholder="Client photo URL"
            onChange={(e) =>
              updateTestimonial(item.id, "avatarUrl", e.target.value)
            }
          />
          <textarea
            aria-label={`Testimonial ${index + 1} review`}
            value={item.comment}
            onChange={(e) =>
              updateTestimonial(item.id, "comment", e.target.value)
            }
          />
          <button type="button" className="ii-outline" onClick={()=>removeTestimonial(index)}>REMOVE REVIEW</button>
        </div>
      ))}
      {testimonials.length<6&&<button type="button" className="ii-outline" onClick={addTestimonial}>ADD A CLIENT REVIEW</button>}
    </section>
  );
}
