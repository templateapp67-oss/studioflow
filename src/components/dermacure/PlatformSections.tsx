import { useDermacure } from "./context";
import { WebsiteSections } from "../WebsiteSections";

export function PlatformSections() {
  const { shared, bookingAvailable, onBook, booking, visible } = useDermacure();
  return (
    <>
      <div className="dc-platform-sections">
        <WebsiteSections
          {...shared}
          resilientPosters
          videoFallbackImage="/templates/dermacure/reference-interior.webp"
          onBook={(selected) =>
            bookingAvailable ? onBook(selected) : booking()
          }
          sections={[
            "share",
            "social",
            "loyalty",
            "policies",
          ].filter((section) => visible[section])}
        />
      </div>
    </>
  );
}
