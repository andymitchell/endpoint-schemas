Quick thoughts on Endpoint Schemas

We still do:
* Tie up end to end
    * fetchEdge is typed, not cast
    * isRequest, endpointResponse validation

Improve
* Align our Endpoint types with the major packages
* Be able to run in silent mode, by remembering previous choices - so can be part of build tool 

Lacking
* No OpenAPI schemas
* I like the [500] esque schemas


Other packages
* trpc
    * Very cool. But requires fully committing to their server approach. Not sure compatible with Supabase? It is, with an Adapter. It’s adding some complex logic. 
        * I’d like to have an escape hatch to this. 
        * It’s nice on the client to have api.functionName(params) (instead of our convoluted fetch)
* Generate from OpenAPI
    * I feel it’s lossy, and what’s the point? The point is robust schema checks from mature tools. 
    * Their schemas seem to require casting 
    * @openapitools/openapi-generator-cli  - needs java 
    * https://www.npmjs.com/package/openapi-typescript doesn’t need java, but does require Node 20 
* Generate own OpenAPI
    * https://www.npmjs.com/package/@asteasolutions/zod-to-openapi 
        * Works with every file registering itself (rather than auto-locating). Which is fine, I guess. 
            * We can use this - just generate the format it wants, pump into regist




Why not adopt tRPC? 
- it’s complex… things will break and it needs digging 
- Unclear if any security leaks 

What does upgrading to it look like? 
- client side DX matters most to match, for an easy upgrade 

It should be a standalone tool, that constantly assesses a repo, and updates another repo. Using only local permissions of the user. Or a directory and constantly updates another. Ideally it would run as GitHub Action. This isn’t magic: it’s still just directories. But configured with relative paths, in a JSON file. A repo knows where to push it. 

This is why OpenAPI matters… it’s perhaps a simpler model, of repo’s pulling rather than pushing. 
Harder in local? Not really. Can just use it locally. 
Can still use EndPointMap this way, but now it’s used as a static served record. Which is how OpenAPI works. So there’s also be a client package. 

