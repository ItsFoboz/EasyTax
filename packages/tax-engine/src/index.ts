export { calculateTax } from "./calculate-tax.js";
export { calculateResidualSocialSecurity } from "./social-security.js";
export { computeVatProximity } from "./vat.js";
export { quarterFromIsoDate, sumByQuarter, computeQuarterly } from "./quarters.js";
export { getTaxConstants, listSupportedYears } from "./constants/index.js";
export type { TaxConstants } from "./constants/index.js";
export type {
  InsuranceProfileType,
  InsuranceProfile,
  Invoice,
  SocialSecurityBreakdown,
  SocialSecurityInput,
  QuarterlyBreakdown,
  TaxResult,
  TaxResultSuccess,
  RequiresAccountant,
} from "./types.js";
