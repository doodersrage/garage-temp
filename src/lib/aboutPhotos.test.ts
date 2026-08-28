import { describe, expect, it } from "vitest";
import { aboutPages } from "./aboutPages";
import {
  aboutHeroPhotoBySlug,
  aboutPhotos,
  getAboutHeroPhoto,
  type AboutPhotoId,
} from "./aboutPhotos";

describe("aboutPhotos", () => {
  it("registers every curated photo with credit metadata", () => {
    const ids = Object.keys(aboutPhotos) as AboutPhotoId[];
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of ids) {
      const photo = aboutPhotos[id];
      expect(photo.id).toBe(id);
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(photo.caption.length).toBeGreaterThan(10);
      expect(photo.credit.length).toBeGreaterThan(5);
      expect(photo.license.length).toBeGreaterThan(2);
      expect(photo.sourceUrl).toMatch(/^https?:\/\//);
      expect(photo.image).toBeTruthy();
    }
  });

  it("maps hero photos only to known about slugs", () => {
    const known = new Set(aboutPages.map((page) => page.slug));
    for (const [slug, photoId] of Object.entries(aboutHeroPhotoBySlug)) {
      expect(known.has(slug), `unknown slug in aboutHeroPhotoBySlug: ${slug}`).toBe(true);
      expect(aboutPhotos[photoId as AboutPhotoId]).toBeTruthy();
      expect(getAboutHeroPhoto(slug)?.id).toBe(photoId);
    }
  });
});
