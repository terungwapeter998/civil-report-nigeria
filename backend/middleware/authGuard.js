export const createAuthGuard = ({ authService, tenantService, hasher, clock }) => {

    const guard = (requiredPermission = null) => {
        return async (req, res, next) => {
            try {

                const token = req.headers?.authorization?.replace("Bearer ", "").trim();
                if (!token) throw new Error("AUTH_MISSING");

                const identity = await authService.verify(token);

                const tenantId = req.headers["x-tenant-id"];
                if (!tenantId) throw new Error("TENANT_REQUIRED");

                const tenantContext = tenantService.createContext(tenantId);

                tenantService.validateContext(tenantContext);

                // SINGLE SOURCE OF TRUTH (NO INLINE SECURITY LOGIC)
                authService.assertTenantAccess(identity, tenantContext);

                if (requiredPermission) {
                    authService.authorize(identity, requiredPermission);
                }

                req.context = deepFreeze({
                    identity,
                    tenant: tenantContext,
                    meta: {
                        traceId: hasher(identity.uid + clock.seq),
                        seq: clock.seq
                    }
                });

                return next();

            } catch (e) {
                return res.status(401).json({
                    code: "UNAUTHORIZED"
                });
            }
        };
    };

    return { guard };
};