import { describe, expect, it } from "vitest";
import { aboutPages } from "./aboutPages";
import {
  aboutHeroPhotoBySlug,
  aboutHubPhotoIds,
  aboutPhotos,
  compareHubPhotoIds,
  compareHubPhotos,
  getAboutHeroPhoto,
  guidesHubPhotoIds,
  guidesHubPhotos,
  storiesHubPhotoIds,
  type AboutPhotoId,
} from "./aboutPhotos";

describe("aboutPhotos", () => {
  it("registers every curated photo with credit metadata", () => {
    const ids = Object.keys(aboutPhotos) as AboutPhotoId[];
    expect(ids.length).toBeGreaterThanOrEqual(16);
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

  it("covers most about pages with a hero photo", () => {
    const covered = aboutPages.filter((page) => aboutHeroPhotoBySlug[page.slug]).length;
    expect(covered / aboutPages.length).toBeGreaterThan(0.85);
  });

  it("keeps hub photo strips disjoint", () => {
    const sets = [aboutHubPhotoIds, guidesHubPhotoIds, compareHubPhotoIds, storiesHubPhotoIds];
    for (const ids of sets) {
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(aboutPhotos[id]).toBeTruthy();
    }
    // Guides and Compare should not share any photos (the original complaint).
    const guides = new Set(guidesHubPhotoIds);
    const overlap = compareHubPhotoIds.filter((id) => guides.has(id));
    expect(overlap).toEqual([]);
  });

  it("labels compare hub photos to alternatives", () => {
    expect(compareHubPhotos).toHaveLength(5);
    for (const item of compareHubPhotos) {
      expect(item.label.length).toBeGreaterThan(3);
      expect(item.href).toMatch(/^\/compare\//);
      expect(aboutPhotos[item.id]).toBeTruthy();
    }
  });

  it("labels guides hub photos to guide categories", () => {
    expect(guidesHubPhotos).toHaveLength(4);
    for (const item of guidesHubPhotos) {
      expect(item.label.length).toBeGreaterThan(3);
      expect(item.href).toMatch(/^\/guides#/);
      expect(aboutPhotos[item.id]).toBeTruthy();
    }
  });
});
