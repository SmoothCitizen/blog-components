import { describe, expect, it } from "vitest";
import { safeFontStack, safeLength } from "../src/theme/schema";

describe("theme value safety", () => {
  it("keeps ordinary font stacks", () => {
    expect(safeFontStack('"Iowan Old Style", Georgia, serif')).toBe('"Iowan Old Style", Georgia, serif');
  });
  it("drops font values that could inject CSS or close the style tag", () => {
    expect(safeFontStack("serif; } body { display:none")).toBeNull();
    expect(safeFontStack("serif</style><script>x</script>")).toBeNull();
    expect(safeFontStack("url(https://x.test/a.woff)")).toBeNull();
  });
  it("accepts plain lengths and rejects anything else", () => {
    expect(safeLength("0.5rem")).toBe("0.5rem");
    expect(safeLength("12px")).toBe("12px");
    expect(safeLength("0")).toBe("0");
    expect(safeLength("1rem; color:red")).toBeNull();
    expect(safeLength("calc(1px)")).toBeNull();
  });
});
