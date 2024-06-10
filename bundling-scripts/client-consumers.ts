// Do not edit. This is auto-generated in the server/API project by @andyrmitchell/endpoint-schemas.

import z, { ZodType } from "zod"; // #EXPORT-REMOVE-PLACEHOLDER
import { FunctionsHttpError, SupabaseClient } from "@supabase/supabase-js"; // #EXPORT-REMOVE-PLACEHOLDER
const EndpointSchemasMap = {'endpointName::endpointMethod': {request: z.object({}), response: z.object({})}}; type EndpointTypesMap = typeof EndpointSchemasMap; // #EXPORT-REMOVE-PLACEHOLDER


const IoSchema = z.object({
    request: z.custom<ZodType<unknown>>(
        (value) => value instanceof ZodType, { message: "Expected a Zod schema" }
    ),
    response: z.custom<ZodType<unknown>>(
        (value) => value instanceof ZodType, { message: "Expected a Zod schema" }
    ),
});
function isIoSchema(x: unknown): x is z.infer<typeof IoSchema> {
    return IoSchema.safeParse(x).success;
}

type InvokeEdgeError<T> = (FunctionsHttpError & {type: 'function', data: T}) | {type: 'other', message: string, data?: T};
type ResponseResult<T> = { data?: T, error?: InvokeEdgeError<T> }
async function invokeEdgeV1<K extends keyof EndpointTypesMap>(endpoint: K, body: EndpointTypesMap[K]['request'] | undefined, supabase: SupabaseClient): Promise<ResponseResult<EndpointTypesMap[K]['response']>> {
    const [endpointName, endpointMethod] = endpoint.split('::') as [keyof typeof EndpointSchemasMap, "POST" | "GET" | "PUT" | "PATCH" | "DELETE"];

    

    // @ts-ignore Let this type check happen, and everything is ok!
    const ioSchema = EndpointSchemasMap[endpointName] && EndpointSchemasMap[endpointName][endpointMethod]? EndpointSchemasMap[endpointName][endpointMethod] : undefined;
    if( isIoSchema(ioSchema) ) {
        if( ioSchema.request.safeParse(body).success ) {
            
            // TODO Probably want a stronger opinion what happens to GET (as it can't have a body), e.g. it always gets reduced to a JSON string in the URL / header
            const response = await supabase.functions.invoke(endpointName, {
                method: endpointMethod,
                body
            });

            if (response.error) {
                const error = response.error;
                if( typeof error.message==='string' ) {
                    if( error.message.indexOf("Failed to send a request to the Edge Function")>-1 ) {
                        console.warn("Local Supabase Edge Functions appear to have stopped. Try starting.", response);
                    }
                }
                if( error instanceof FunctionsHttpError ) {
                    let returnError:InvokeEdgeError<EndpointTypesMap[K]['response']> | undefined;
                    try {
                        const data = await response.error.context.json();
                        returnError = {
                            type: 'function',
                            data, // Same data as sent from server
                            ...error
                        }
                    } catch(e) {
                        console.error("Error parsing Supabase response FunctionsHttpError context ", e);
                    }
                    if( returnError && ioSchema.response.safeParse(returnError.data).success ) {
                        return {error: returnError};
                    } else {
                        return {error: {type: 'other', message: "Could not validate the error's response body. Hint: this auto-generated file might be out of date. Rerun the export script first. Hint: This is an error response."}};
                    }
                }
                return { error: response.error };
            } else {
                const parseResult = ioSchema.response.safeParse(response.data);
                if( parseResult.success ) {
                    return { data: response.data }
                } else {
                    return {error: {type: 'other', data: response.data, message: `Could not validate the response body: ${parseResult.error}. Hint: this auto-generated file might be out of date. Rerun the export script first.`}};
                }
            }
        } else {
            return {error: {type: 'other', message: "Could not validate request body."}};
        }
    } else {
        return {error: {type: 'other', message: "Schema for EndpointSchemasMap[endpointName][endpointMethod] did not include request/response schemas. Hint: it's derived from the endpoint's internal endpoint.ts, so check that first. Then check the export script that creates this file."}}
    }
}
function makeInvokeEdgeWithSupabaseInlineV1(supabase: SupabaseClient):<K extends keyof EndpointTypesMap>(endpoint: K, body: EndpointTypesMap[K]['request'] | undefined) => Promise<ResponseResult<EndpointTypesMap[K]['response']>> {
    return (endpoint, body) => invokeEdgeV1(endpoint, body, supabase);
}

type FetchServerDetails = {root_url:string, bearer_token: string};
async function fetchEdgeV1<K extends keyof EndpointTypesMap>(endpoint: K, body: EndpointTypesMap[K]['request'] | undefined, server: FetchServerDetails): Promise<ResponseResult<EndpointTypesMap[K]['response']>> {
    
    // TODO This will need to support different bearer tokens for different routes, defined on the server side (anon or authorized). Or maybe not... maybe just AuthContext needs to use the best key it has.

    const [endpointName, endpointMethod] = endpoint.split('::') as [keyof typeof EndpointSchemasMap, "POST" | "GET" | "PUT" | "PATCH" | "DELETE"];

    
    // @ts-ignore Let this type check happen, and everything is ok!
    const ioSchema = EndpointSchemasMap[endpointName] && EndpointSchemasMap[endpointName][endpointMethod]? EndpointSchemasMap[endpointName][endpointMethod] : undefined;
    if( isIoSchema(ioSchema) ) {
        if( ioSchema.request.safeParse(body).success ) {
            
            const response = await fetch(`${server.root_url}${endpointName}`, {
                method: endpointMethod,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${server.bearer_token}`
                },
                body: JSON.stringify(body)
            })
            if( response.ok ) {
                let output: ResponseResult<EndpointTypesMap[K]["response"]>;
                if( response.headers.get('Content-Type')==='application/json') {
                    output = {data: await response.json() };
                } else if( response.headers.get('X-Response-Format')==='Uint8Array' ) {
                    output = {data: new Uint8Array(await response.arrayBuffer() as Uint8Array) as unknown as EndpointTypesMap[K]["response"] };
                } else {
                    return {error: {type: 'other', message: "Unsupported content type returned."}};
                }
                const parseResult = ioSchema.response.safeParse(output.data);
                if( parseResult.success ) {
                    return output as ResponseResult<EndpointTypesMap[K]["response"]>;
                } else {
                    return {error: {type: 'other', data: output.data, message: `Could not validate the response body: ${parseResult.error}. Hint: this auto-generated file might be out of date. Rerun the export script first.`}};
                }
            } else {
                return {error: {type: 'other', message: "Server returned a non-OK response. Status: "+response.status}};
            }

        } else {
            return {error: {type: 'other', message: "Could not validate request body."}};
        }
    } else {
        return {error: {type: 'other', message: "Schema for EndpointSchemasMap[endpointName][endpointMethod] did not include request/response schemas. Hint: it's derived from the endpoint's internal endpoint.ts, so check that first. Then check the export script that creates this file."}}
    }
}
function makeFetchEdgeWithServerInlineV1(server: FetchServerDetails):<K extends keyof EndpointTypesMap>(endpoint: K, body: EndpointTypesMap[K]['request'] | undefined) => Promise<ResponseResult<EndpointTypesMap[K]['response']>> {
    return (endpoint, body) => fetchEdgeV1(endpoint, body, server);
}

export const invokeEdge = invokeEdgeV1;
export const makeInvokeEdgeWithSupabaseInline = makeInvokeEdgeWithSupabaseInlineV1;

export const fetchEdge = fetchEdgeV1;
export const makeFetchEdgeWithServerInline = makeFetchEdgeWithServerInlineV1;