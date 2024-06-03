## Guard your endpoints and generate a TypeClient client for consuming them

Goals
- Share all the types a client would need to know about, with no maintenance overhead
- Validate the data transferred from client to endpoint (and vice versa)

## Installing

`npm i @andyrmitchell/endpoint-schemas`

## How to use it

### 1. Add an endpoint.ts to each endpoint directory

E.g. in Supabase, add `endpoint.ts` to each function directory, such as `/supabase/functions/function-name` 

### 2. Specify what is a valid response (and optionally a request) 

In `endpoint.ts`, have something like this:

```typescript
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

```

The exported const must be called `EndpointSchemas` (no defaults), and must be in this format:
```typescript
type EndpointSchemasType = {
    [K: 'GET' | 'POST' | 'PUT' | 'DELETE']: {
        request: z.ZodTypeAny,
        response: z.ZodTypeAny
    };
};
```

### 3. Validate your actual endpoint (optional)

E.g. in Supabase, in `/supabase/functions/function-name/index.ts`:

```typescript
import { EndpointSchemas } from "./endpoint.ts";
import {isRequest, endpointResponse} from '@andyrmitchell/endpoint-schemas'

serve(async (req) => {

    // Validate the input against your schema
    const input = await req.json();
    if( !isRequest(EndpointSchemas, 'POST', input) ) {
        return new Response(JSON.stringify({error: 'Invalid body'}), {headers: {status: 400}});
    }

    // Do processing

    // Use endpointResponse to type check your response immediately against EndpointSchemas
    return endpointResponse(EndpointSchemas, 'POST', 200, {
        success: true, 
        products: [1,2,3]
    }, {});
})
```

### 4. Generate TypeScript for any client of your API / serverless functions

- In Terminal, go to your package root
- Make sure you've installed this package (`npm i @andyrmitchell/endpoint-schemas`)
- `npx make-endpoint-schemas-client`
    - It will ask you where your functions are kept, find every `endpoint.ts` within that root (i.e. every endpoint), and output a .ts file in the destination directory that you choose, called `EndpointMap.ts`. 
    - _Recommendation_: Make this part of your build/deploy process
- In your client/consumer code, import `EndpointMap.ts`


#### To fetch a fully type checked endpoint

```typescript 

import {fetchEdge} from './path/to/EndpointMap.ts'

const resource = await fetchEdge('endpoint1::POST', {bundle_id: 1}, {'root_url': 'https://api.yourserver.com', 'bearer_token': 'auth123'});
// This is all type checked, and will autocomplete in your IDE. (Notice it matches the server's endpoint.ts)
if( resource.data?.success ) {
    resource.data.products;
}

```

#### To fetch a fully type checked Supabase function

As above, but use `invokeEdge` instead of `fetchEdge`



## Limitations

### Imported modules cannot use 'default' and risk namespace collision

If two end points import two modules, that both export a 'run' item, potentially bad things happen: 
- At the very least, the output file will have two 'run' declarations, causing a conflict
- If they have two different purposes, it'll be hard to decide which to use. 

Current Solution
- Manually try to make sure endpoint.ts doesn't repeat names anywhere in its imports. Good luck!

TODO Future Solution
- The dream is that some code will be able to sensibly roll up imports into one TypeScript file
    - Obviously Webpack/esbuild does this... but only to output Javascript. No good, as we need the types. 
        - They do support plugins, which might be a pathway
        - tsconfig also exports a type declaration file alongside it. We'd lose the schemas, but maybe they're fine in pure Javascript. WORTH INVESTIGATING.
            - We could change our approach, to only output the Zod Schemas (pure JS), then use z.infer on the client end to turn them back into types.
    - I'm sure Deno must do this, as its TypeScript native (no need to convert) but you might still want to bundle into one file for performance.
        - Deno vendor: downloads remote imports to a local ./vendor folder
        - Deno compile: rolls things up, but to an executable 
    - Microsoft's API Extractor comes close, but doesn't seem to like Deno (needs tsconfig and package.json, etc.). Also it's technically just for .d.ts files. 
    - Use something like ncc (or Deno emit, or vercel/pkg) but with tsconfig's declaration: true. It should generate type outputs. We wouldn't get the schemas though. 
        - https://stackoverflow.com/questions/15868100/compile-all-typescript-files-into-single-typescript-file 
    - It _must_ be a solved problem... 
- Failing that, we must namespace things. 
    - Change the way it works, so it recursively imports immediately upon reaching every endpoint.ts file (its too late to disambiguate after they've merged mulitple endpoint.ts). 
    - That recursive import should find the tokens in the export, give them a prefix, and update the importing file too. 
        - This is likely to be very brittle with different non-word boundaries. 
            - It's probably a game of whackamole to find edge cases. It might be easier to convert export script to Javascript, as I'm more comfortable with that. 


## Roadmap

### Solve the limitation by using esbuild instead

### Loosen the requirement to be in a directory

- make it possible to optionally state/override the endpoint name as a const in endpoint.ts (the generator code would then extract this)