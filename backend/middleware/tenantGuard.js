/**
 * STAGE 6 TENANT GUARD (FINAL FORM)
 * PURE BOUNDARY ENFORCEMENT ONLY
 */

export const createTenantGuard = (tenantService) => {

    const guard = () => {
        return (req, res, next) => {
            try {

                /**
                 * 1. AUTH CONTEXT PRESENCE (NO AUTH LOGIC)
                 */
                const identity = req.context?.identity;

                if (!identity) {
                    throw new Error("GUARD_ORDER_VIOLATION");
                }

                /**
                 * 2. EXPLICIT TENANT INPUT ONLY
                 */
                const tenantId = req.headers?.["x-tenant-id"];

                if (!tenantId) {
                    throw new Error("TENANT_REQUIRED");
                }

                /**
                 * 3. DELEGATED VALIDATION ONLY (NO DECISION MAKING HERE)
                 * Identity-Tenant binding MUST be validated in authService
                 */
                if (!identity.tenantIds?.includes?.(tenantId)) {
                    throw new Error("TENANT_ACCESS_DENIED");
                }

                /**
                 * 4. BOUNDARY CONSTRUCTION (DETERMINISTIC ONLY)
                 */
                const tenantContext = tenantService.createContext(tenantId);

                tenantService.validateContext(tenantContext);

                /**
                 * 5. IMMUTABLE ATTACHMENT (NO REPLACEMENT OF CONTEXT)
                 */
                req.context.tenant = Object.freeze(tenantContext);

                return next();

            } catch (err) {

                return res.status(403).json({
                    code: "TENANT_ACCESS_DENIED",
                    trace_id: req.context?.meta?.traceId
                });
            }
        };
    };

    return Object.freeze({ guard });
};