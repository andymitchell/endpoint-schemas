import z from "zod";

type HttpMethods = 'GET' | 'POST' | 'PUT' | 'DELETE';
type EndpointSchemasType = {
    [K: string]: {
        request: z.ZodTypeAny,
        response: z.ZodTypeAny
    };
};

type ResponseFormat = {
    "Content-Type": string, 
    "X-Response-Format": "json" | "Uint8Array"
}



export function isRequest<T extends EndpointSchemasType, M extends HttpMethods>(schemas: T, method: M, x: unknown): x is z.infer<typeof schemas[M]['request']> {
    const io = schemas[method];
    return io && io.request.safeParse(x).success;
}

export function isResponse<T extends EndpointSchemasType, M extends HttpMethods>(schemas: T, method: M, x: unknown): x is z.infer<typeof schemas[M]['response']> {
    const io = schemas[method];
    return io && io.response.safeParse(x).success;
}



export function endpointResponse<S extends EndpointSchemasType, M extends keyof S>(
    schemas: S,
    method: M,
    status: number,
    body: z.infer<typeof schemas[M]['response']>,
    headersInit?: HeadersInit,
    responseFormat:ResponseFormat = {
        "Content-Type": "application/json",
        "X-Response-Format": "json"
    },
    validate = true
): Response {

    if (validate) {
        const schemaMethod = schemas[method];
        if( !schemaMethod ) throw new Error("Unknown schemas[method]");
        const parseResult = schemaMethod.response.safeParse(body);
        if (!parseResult.success) {
            let response_json = '';
            try {
                response_json = JSON.stringify(body);
            } catch (_e) {
                response_json = 'Cannot stringify';
            }
            throw new Error(`Could not validate response. Parse error: ${parseResult.error}. Response: ${response_json}`);
        }

        if( responseFormat["X-Response-Format"]==='Uint8Array' ) {
            if( !((body as unknown) instanceof Uint8Array) ) {
                throw new Error(`Could not validate response. Parse error: body not Uint8Array`);
            }
        }
    }

    const headers:Record<string, string> = {
        ...convertHeadersInitToRecord(headersInit),
        ...responseFormat
    };
    headers["Access-Control-Expose-Headers"] = [
        "X-Response-Format",
        ...(headers["Access-Control-Expose-Headers"] ?? '').split(',')
    ].join(',');
    
    
    const formattedBody = headers["Content-Type"]==='application/json'? JSON.stringify(body) : body;

    const response = new Response(formattedBody,
        {
            headers,
            status
        }
    );

    return response;
};


export class ResponseError<S extends EndpointSchemasType, M extends keyof S> extends Error {
    public response: Response;
    constructor(schemas: S, method: M, internalMessage: string, status: number, body: z.infer<typeof schemas[M]['response']>, headers?: HeadersInit) {
        const messageParts = [`[${status} error] ${internalMessage}`];
        try {
            messageParts.push(`Response: ` + JSON.stringify(body));
        } catch (_e) {
            messageParts.push(`Response: [stringify failed]`);
        }
        super(messageParts.join(' '));

        this.response = endpointResponse(schemas, method, status, body, headers);
    }


}


function convertHeadersInitToRecord(headers:HeadersInit | undefined):Record<string, string> {
    function isRecord(x: unknown):x is Record<string, string> {
        return !!x && typeof x==='object';
    }

    const output:Record<string, string> = {};
    if( Array.isArray(headers) ) {
        headers.forEach(([key, value]) => {
            output[key] = value;
        })
    } else if( isRecord(headers) ) {
        let key:string;
        for( key in headers ) {
            const headerValue = headers[key];
            if( headerValue ) {
                output[key] = headerValue;
            }
        }
    }

    return output;
}


export function endpointErrorResponse<S extends EndpointSchemasType, M extends keyof S>(
    error: Error | ResponseError<S, M>,
    schemas: S,
    method: M,
    body: z.infer<typeof schemas[M]['response']>,
    headers?: HeadersInit,
    traceCallingFunction?: boolean
): Response {
    function callingEndpoint(): string {
        const traceableError = new Error();
        const stackLines = (traceableError.stack || '').split("\n");
        // Try to get the invoking endpoint, but keep a range to support different environments
        return stackLines.slice(2, 4).join('\n');
    }

    if (error instanceof ResponseError) {
        console.warn("ResponseError", error, traceCallingFunction? `EndPoint: ${callingEndpoint()}` : '');
        return error.response;
    } else {
        console.warn("Error", error, traceCallingFunction? `EndPoint: ${callingEndpoint()}` : '');
        return endpointResponse(schemas, method, 500, body, headers);
    }
}

