export interface StudioLayoutMeasurement {
  page: {
    width: number;
    height: number;
    scrollWidth: number;
    scrollHeight: number;
    horizontalOverflowPx: number;
    verticalOverflowPx: number;
  };
  zones: Record<string, {
    present: boolean;
    top: number;
    bottom: number;
    height: number;
    childCount: number;
    freeBottomPx: number | null;
    contentHeightPct: number | null;
  }>;
  typography: {
    minFontPx: number | null;
    smallTextCount: number;
  };
  blockers: string[];
  warnings: string[];
  score: number;
}

export interface StudioLayoutThresholds {
  pageWidth: number;
  pageHeight: number;
  minUpperHeight: number;
  maxRailHeight: number;
  maxUpperFreeBottomPx: number;
  maxRailFreeBottomPx: number;
  minUpperContentHeightPct: number;
  minReadableFontPx: number;
}

export const VISUAL_ATLAS_THRESHOLDS: StudioLayoutThresholds = {
  pageWidth: 768,
  pageHeight: 1152,
  minUpperHeight: 480,
  maxRailHeight: 320,
  maxUpperFreeBottomPx: 72,
  maxRailFreeBottomPx: 96,
  minUpperContentHeightPct: 72,
  minReadableFontPx: 7.5,
};

export function assessStudioLayout(
  measurement: StudioLayoutMeasurement,
  thresholds: StudioLayoutThresholds = VISUAL_ATLAS_THRESHOLDS,
): StudioLayoutMeasurement {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (measurement.page.width !== thresholds.pageWidth) {
    blockers.push(`page_width_expected_${thresholds.pageWidth}_got_${measurement.page.width}`);
  }
  if (measurement.page.height !== thresholds.pageHeight) {
    blockers.push(`page_height_expected_${thresholds.pageHeight}_got_${measurement.page.height}`);
  }
  if (measurement.page.horizontalOverflowPx > 0) {
    blockers.push(`horizontal_overflow_${measurement.page.horizontalOverflowPx}px`);
  }
  if (measurement.page.verticalOverflowPx > 0) {
    blockers.push(`vertical_overflow_${measurement.page.verticalOverflowPx}px`);
  }

  for (const zone of ["hero", "guide_question", "upper_visual", "exam_rail", "footer"]) {
    if (!measurement.zones[zone]?.present) {
      blockers.push(`missing_zone_${zone}`);
    }
  }

  const upper = measurement.zones.upper_visual;
  const rail = measurement.zones.exam_rail;
  const footer = measurement.zones.footer;

  if (upper?.present) {
    if (upper.height < thresholds.minUpperHeight) {
      warnings.push(`upper_too_short_${upper.height}px`);
    }
    if ((upper.freeBottomPx ?? 0) > thresholds.maxUpperFreeBottomPx) {
      warnings.push(`upper_free_bottom_${upper.freeBottomPx}px`);
    }
    if ((upper.contentHeightPct ?? 100) < thresholds.minUpperContentHeightPct) {
      warnings.push(`upper_low_content_height_${upper.contentHeightPct}%`);
    }
  }

  if (rail?.present) {
    if (rail.height > thresholds.maxRailHeight) {
      warnings.push(`rail_too_tall_${rail.height}px`);
    }
    if ((rail.freeBottomPx ?? 0) > thresholds.maxRailFreeBottomPx) {
      warnings.push(`rail_free_bottom_${rail.freeBottomPx}px`);
    }
  }

  if (footer?.present && footer.bottom > measurement.page.height) {
    blockers.push(`footer_below_page_${footer.bottom}px`);
  }

  if (measurement.typography.minFontPx !== null && measurement.typography.minFontPx < thresholds.minReadableFontPx) {
    warnings.push(`microtext_min_${measurement.typography.minFontPx}px`);
  }
  if (measurement.typography.smallTextCount > 12) {
    warnings.push(`microtext_count_${measurement.typography.smallTextCount}`);
  }

  const score = Math.max(0, Math.min(10, 10 - blockers.length * 2.5 - warnings.length * 0.55));

  return {
    ...measurement,
    blockers,
    warnings,
    score: Number(score.toFixed(1)),
  };
}
