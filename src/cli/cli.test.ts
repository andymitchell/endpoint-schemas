

import { Answer, IUserInput, QuestionChain, fileIoNode, getPackageDirectory, stripTrailingSlash } from "@andyrmitchell/file-io";
import { cli } from "./cli"


let testEnvPath:string;
let rootPath:string;
let testDestPath:string;



beforeAll(async () => {
    testEnvPath = `${stripTrailingSlash(await getPackageDirectory())}/test-env`;
    rootPath = `${testEnvPath}/example-functions`;
    testDestPath = `${testEnvPath}/output`;

})
beforeEach(async () => {
    await fileIoNode.remove_directory(testDestPath, true);
    await fileIoNode.make_directory(testDestPath);
});
afterEach(async () => {
    await fileIoNode.remove_directory(testDestPath, true);
})

describe('Endpoint schema generation', () => {
    

    class TestUserInput implements IUserInput {
        async ask(questionChain: QuestionChain): Promise<Answer> {
            if( questionChain.name==='endpoint-root-dir' ) {
                return {type: 'single', answer: rootPath, name: questionChain.name};
            }
            if( questionChain.name==='destination-dir' ) {
                return {type: 'single', answer: testDestPath, name: questionChain.name};
            }
            return {type: 'abort', answer: undefined};
        }
        close(): void {
            throw new Error("Method not implemented.");
        }
    }


    test('Basic', async () => {
        
        const userInput:IUserInput = new TestUserInput();
        
    
        // Run it
        let error = false;
        try {
            await cli(userInput, fileIoNode);
        } catch(e) {
            error = true;
            debugger;
        }
    
        expect(error).toBe(false);

        const hasOutput = await fileIoNode.has_file(`${testDestPath}/EndpointMap.ts`);
        expect(hasOutput).toBe(true);

        const fileContents = await fileIoNode.read(`${testDestPath}/EndpointMap.ts`);
        expect(fileContents && fileContents.length>0).toBe(true); if( !fileContents ) throw new Error("noop");

        expect(fileContents.indexOf(`'endpoint1': Endpoint1_EndpointSchemas`)>-1).toBe(true);
        expect(fileContents.indexOf(`'endpoint1::POST':`)>-1).toBe(true);

        debugger;
        
    }, 1000*60*2)

    
})
