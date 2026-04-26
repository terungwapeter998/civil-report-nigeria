/**
 * STAGE 6 ROLE GUARD (PURE ENFORCEMENT LAYER)
 * NO TRANSFORMATION. NO NORMALIZATION. NO DECISION LOGIC.
 */

export const createRoleGuard = () => {

    const guard = (requiredRoles) => {

        const required = Array.isArray(requiredRoles)
            ? requiredRoles
            : [requiredRoles];

        if (required.length === 0) {
            throw new Error("SYSTEM_INVARIANT_VIOLATION: Missing role contract");
        }

        return (req, res, next) => {
            try {

                const context = req.context;

                if (!context || !context.identity) {
                    throw new Error("AUTH_CONTEXT_MISSING");
                }

                const userRoles = context.identity.roles;

                if (!Array.isArray(userRoles)) {
                    throw new Error("ROLE_CONTRACT_INVALID");
                }

                /**
                 * PURE SET CHECK (NO TRANSFORMATIONS)
                 * ASSUMPTION: roles are already canonical from authService
                 */
                const authorized = required.some(r =>
                    userRoles.includes(r)
                );

                if (!authorized) {
                    return res.status(403).json({
                        code: "FORBIDDEN",
                        trace_id: context?.meta?.traceId
                    });
                }

                return next();

            } catch (err) {

                return res.status(403).json({
                    code: "FORBIDDEN"
                });
            }
        };
    };

    return Object.freeze({ guard });
};