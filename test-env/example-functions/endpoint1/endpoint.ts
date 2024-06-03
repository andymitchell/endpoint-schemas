import z from "zod";

export const EndpointSchemas = {
    'POST': {
        request: z.object({
            bundle_id: z.number()
        }),
        response: z.object({
            success: z.boolean(),
            products: z.array(z.number())
        })
    }
};