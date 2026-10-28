import type { Dispatch, SetStateAction } from "react";
import type { SalonProfile } from "../../types";
import { BrandImageField } from "../BrandImageField";
export function ClinicTechnologyEditor({
  profile,
  setProfile,
}: {
  profile: SalonProfile;
  setProfile: Dispatch<SetStateAction<SalonProfile>>;
}) {
  const value = profile.clinicTechnology || {
    name: "",
    manufacturer: "",
    specifications: "",
    imageUrl: "",
    approved: false,
  };
  const patch = (changes: Partial<typeof value>) =>
    setProfile((p) => ({ ...p, clinicTechnology: { ...value, ...changes } }));
  return (
    <fieldset className="mt-6 border p-4">
      <legend>Template 07 · Editorial content &amp; clinic technology</legend>
      <div className="form-grid">
        {(
          [
            ["heroTitle", "Hero headline"],
            ["heroDescription", "Hero supporting copy"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              className="workspace-input"
              rows={2}
              maxLength={key === "heroTitle" ? 180 : 500}
              value={profile.sectionHeadings?.[key] || ""}
              onChange={(e) => {
                const text = e.target.value;
                setProfile((p) => ({
                  ...p,
                  sectionHeadings: { ...p.sectionHeadings, [key]: text },
                }));
              }}
            />
            <small>
              Leave blank to use the design specification’s default copy.
            </small>
          </label>
        ))}
      </div>
      <p>
        Only publish details verified against your clinic’s equipment
        documentation. No approvals or outcomes are generated automatically.
      </p>
      <div className="form-grid">
        <label>
          Equipment / model
          <input
            className="workspace-input"
            maxLength={160}
            value={value.name}
            onChange={(e) => patch({ name: e.target.value, approved: false })}
          />
        </label>
        <label>
          Manufacturer
          <input
            className="workspace-input"
            maxLength={160}
            value={value.manufacturer}
            onChange={(e) =>
              patch({ manufacturer: e.target.value, approved: false })
            }
          />
        </label>
        <label>
          Technical specifications
          <textarea
            className="workspace-input"
            rows={4}
            maxLength={1500}
            value={value.specifications}
            onChange={(e) =>
              patch({ specifications: e.target.value, approved: false })
            }
          />
        </label>
        <BrandImageField
          label="Actual equipment photograph"
          uploadName="Clinic equipment"
          value={value.imageUrl}
          onChange={(imageUrl) => patch({ imageUrl, approved: false })}
        />
      </div>
      <label>
        <input
          type="checkbox"
          checked={value.approved}
          onChange={(e) => patch({ approved: e.target.checked })}
        />{" "}
        I have verified these details and approve them for publication.
      </label>
      <hr />
      <h3>Clinic legal notices</h3>
      <p>
        Publish only your clinic’s approved privacy and terms text. Blank
        documents are not linked.
      </p>
      {(["privacy", "terms"] as const).map((key) => (
        <label key={key}>
          {key === "privacy" ? "Privacy policy" : "Terms & conditions"}
          <textarea
            className="workspace-input"
            rows={5}
            maxLength={10000}
            value={profile.clinicLegal?.[key] || ""}
            onChange={(e) => {
              const text = e.target.value;
              setProfile((p) => ({
                ...p,
                clinicLegal: {
                  privacy: p.clinicLegal?.privacy || "",
                  terms: p.clinicLegal?.terms || "",
                  [key]: text,
                },
              }));
            }}
          />
        </label>
      ))}
    </fieldset>
  );
}
