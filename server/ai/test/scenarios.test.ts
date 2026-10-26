import { describe, expect, it } from "vitest";
import { COURSES, getCourse, getScenario } from "../src/scenarios.js";

describe("senaryolar", () => {
  it("5 kurs tanımlıdır", () => {
    expect(COURSES.map((c) => c.id).sort()).toEqual(["tr-de", "tr-en", "tr-es", "tr-fr", "tr-it"]);
  });

  it("her kursta 8 senaryo vardır", () => {
    for (const course of COURSES) {
      expect(course.scenarios).toHaveLength(8);
    }
  });

  it("senaryo id'leri tüm kurslarda aynı ve tekilidir", () => {
    const ids = COURSES[0].scenarios.map((s) => s.id);
    expect(new Set(ids).size).toBe(8);
    for (const course of COURSES) {
      expect(course.scenarios.map((s) => s.id)).toEqual(ids);
    }
  });

  it("açılış cümleleri boş değildir ve Türkçe değildir", () => {
    const turkishOnly = /[ğşıİ]/;
    for (const course of COURSES) {
      for (const s of course.scenarios) {
        expect(s.opener.length).toBeGreaterThan(5);
        expect(turkishOnly.test(s.opener)).toBe(false);
      }
    }
  });

  it("seviyeler A1/A2/B1 aralığındadır; erken senaryolar daha kolay", () => {
    const levels = COURSES[0].scenarios.map((s) => s.level);
    expect(levels).toEqual(["A1", "A1", "A2", "A2", "A2", "B1", "B1", "B1"]);
  });

  it("alanlar sözleşmeye uyar", () => {
    const s = getScenario("tr-fr", "kafe")!;
    expect(s).toMatchObject({
      id: "kafe",
      titleTr: "Kafede sipariş",
      level: "A1",
    });
    expect(s.descriptionTr.length).toBeGreaterThan(0);
    expect(s.goalTr.length).toBeGreaterThan(0);
    expect(getCourse("tr-yok")).toBeUndefined();
  });
});
