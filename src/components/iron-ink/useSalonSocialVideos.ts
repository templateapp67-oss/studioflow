import { useCallback, useEffect, useState } from "react";
import {
  fetchOwnerSalonSocialVideos,
  fetchPublicSalonSocialVideos,
  type SalonSocialVideo,
} from "../../lib/salonSocialVideos";

/** Public storefront videos for one salon slug. Never throws, never blocks. */
export function usePublicSalonSocialVideos(slug?: string) {
  const [videos, setVideos] = useState<SalonSocialVideo[]>([]);
  const [loading, setLoading] = useState(Boolean(slug));
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!slug) {
      setVideos([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchPublicSalonSocialVideos(slug)
      .then((rows) => {
        if (active) setVideos(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, revision]);

  return {
    videos,
    loading,
    refresh: useCallback(() => setRevision((value) => value + 1), []),
  };
}

/** Owner-side videos (RLS scoped to the signed-in salon). */
export function useOwnerSalonSocialVideos() {
  const [videos, setVideos] = useState<SalonSocialVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchOwnerSalonSocialVideos()
      .then((rows) => {
        if (active) setVideos(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  return {
    videos,
    loading,
    refresh: useCallback(() => setRevision((value) => value + 1), []),
  };
}
