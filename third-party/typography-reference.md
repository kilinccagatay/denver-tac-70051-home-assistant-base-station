Typography reference audit — 2026-11-13

https://github.com/alistairmerritt/iOS-Tablet-Dashboard/blob/main/YAML#L11440 explicitly sets SF Pro Rounded on the clock card. Other explicit occurrences: lines 3149, 3429, 3439, 3448, 4542.

https://github.com/alistairmerritt/iOS-dashboard/blob/main/home-assistant has no font-family declaration and does not include theme files. These are different references.

Current local preview uses Apple’s SF Rounded from macOS SFNSRounded.ttf (internal family .SF NS Rounded), statically instantiated at weights 400/500/600/700 and embedded as WOFF with Turkish glyphs. This is not Inter or an approximation drawn by the assistant. Clock size and weight 700 are preserved. Font binaries retain embedded original name/copyright metadata. Deployed to both existing legacy WebViews on 2026-11-13; included in this interface source revision. Newer OVERLAP_SIMPLE/OVERLAP_COMPOUND glyph flags are cleared in the embedded static WOFF files because legacy Crosswalk OTS rejected them. Glyph outlines and original font metadata are retained.

The user-selected orange house is a custom SVG and intentionally overrides the SF house symbol.
