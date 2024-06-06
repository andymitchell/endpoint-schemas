import { IFileIo, IUserInput, getDirectoryFromUser, getInvocationDirectory, getPackageDirectory } from "@andyrmitchell/file-io";


export async function cli(userInput:IUserInput, fileSystem:IFileIo) {
    //console.log("Environment Overview", {'invocation_dir': getInvocationDirectory(), 'invocation_script_dir': await getInvokedScriptDirectory(), 'pkg_dir': await getPackageDirectory()});

    const currentDirectory = await getInvocationDirectory();
    
    const allEndpointDirectories = await fileSystem.list_files(currentDirectory, {recurse: true, file_pattern: /endpoint\.ts$/i});
    const lowestDirectory = allEndpointDirectories.reduce((prev, cur) => {
        return ( cur.path.length < prev.length )? cur.path : prev;
    }, allEndpointDirectories[0]?.path ?? '');
    
    const rootAbsoluteUri = await getDirectoryFromUser(
        userInput,
        fileSystem,
        lowestDirectory,
        'endpoint-root-dir',
        "What is the root directory of all your endpoints?",
        lowestDirectory? [lowestDirectory] : []
    )

    if( !rootAbsoluteUri ) {
        console.warn("Aborting - no root path chosen");
        return;
    }

    const destinationAbsoluteUri  = await getDirectoryFromUser(
        userInput,
        fileSystem,
        lowestDirectory,
        'destination-dir',
        "In which directory should the generated consumer client be placed?",
        [
            `${currentDirectory}/temp`,
            `${currentDirectory}/dist`
        ]
    )
    // TODO Search a path above, for index.tsx files. Also remember the last chosen one. And accept relative paths. 

    if( !destinationAbsoluteUri ) {
        console.warn("Aborting - no destination path chosen");
        return;
    }

    
    await bootstrapTheBundlingScript(fileSystem, rootAbsoluteUri, destinationAbsoluteUri);
    
}


async function bootstrapTheBundlingScript(fileSystem:IFileIo, rootAbsoluteUri:string, destinationAbsoluteUri:string) {
    // Create a temp folder (and remember if we created it, so can remove it)

    const packageTempDir = `${await getPackageDirectory()}/tmp`;
    const hadTmp = await fileSystem.has_directory(packageTempDir);

    if( !hadTmp ) {
        fileSystem.make_directory(packageTempDir);
    }

    try {

        // Read in export.example.ts, update its file paths, and place it in the temp directory (within this package)
        let fileContents = await fileSystem.read(`${await getPackageDirectory()}/bundling-scripts/export.example.sh`);
        if( !fileContents ) throw new Error("Could not read ./bundling-scripts/export.example.sh");

        // Modify the variables
        fileContents = fileContents.replace(
            /^RELATIVE_LOCATION_OF_EXPORT_FUNCTION_SCHEMAS=.*$/gm, 
            `RELATIVE_LOCATION_OF_EXPORT_FUNCTION_SCHEMAS="${await getPackageDirectory()}/bundling-scripts/export_function_schemas.sh"`
        );
        fileContents = fileContents.replace(
            /^ROOT_DIR=.*$/gm, 
            `ROOT_DIR="${rootAbsoluteUri}"`
        );
        fileContents = fileContents.replace(
            /^OUTPUT_CLIENT_TYPESCRIPT=.*$/gm, 
            `OUTPUT_CLIENT_TYPESCRIPT="${destinationAbsoluteUri}/EndpointMap.ts"`
        );

        // Write it to temp
        const bundlerAbsoluteUri = `${packageTempDir}/export.sh`;
        await fileSystem.write(bundlerAbsoluteUri, fileContents);


        // chmod it, then run it
        await fileSystem.chmod_file(bundlerAbsoluteUri, '755');
        
        const ouput = await fileSystem.execute(bundlerAbsoluteUri);
        

    } finally {
        if( !hadTmp ) {
            fileSystem.remove_directory(packageTempDir, true);
        }
    }

}
