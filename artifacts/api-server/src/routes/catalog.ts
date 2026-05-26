import { Router } from "express";
import {
  EDITORIAL_FORMATS,
  getCertificationSummary,
  getProviderSummary,
} from "../domain/catalog/editorial-catalog";

const router = Router();

router.get("/catalog/providers", (_req, res): void => {
  res.json({
    source: "api_editorial_catalog_v1",
    providers: getProviderSummary(),
  });
});

router.get("/catalog/providers/:providerId/certifications", (req, res): void => {
  const providerId = String(req.params.providerId);
  res.json({
    source: "api_editorial_catalog_v1",
    providerId,
    certifications: getCertificationSummary(providerId),
  });
});

router.get("/catalog/certifications/:certificationId/formats", (req, res): void => {
  const certificationId = String(req.params.certificationId);
  const formats = EDITORIAL_FORMATS
    .filter((format) => format.certificationId === certificationId)
    .sort((a, b) => a.productionOrder - b.productionOrder);

  res.json({
    source: "api_editorial_catalog_v1",
    certificationId,
    formats,
  });
});

export default router;
