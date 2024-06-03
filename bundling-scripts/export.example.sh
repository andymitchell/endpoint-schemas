#!/bin/bash

# Point to export_function_schemas.sh, from wherever you move this example to
RELATIVE_LOCATION_OF_EXPORT_FUNCTION_SCHEMAS="./export_function_schemas.sh"

# This is any root that's low enough to include all your endpoint.ts files 
ROOT_DIR="../../../../../"

# This is the file that'll be used in the client
OUTPUT_CLIENT_TYPESCRIPT="${ROOT_DIR}/jrai-website/src/EndpointMap.ts"

# Provide the package names that the client will understand (also make sure they're installed via npm/etc for the client)
ZOD_PACKAGE="zod"
SUPABASECLIENT_PACKAGE="@supabase/supabase-js"


# =======
# =======

function run_export() {
    source "$RELATIVE_LOCATION_OF_EXPORT_FUNCTION_SCHEMAS"
    export_function_schemas "$ROOT_DIR" "$OUTPUT_CLIENT_TYPESCRIPT" "$ZOD_PACKAGE" "$SUPABASECLIENT_PACKAGE"
}

# Ensure fswatch is installed
function ensure_fswatch_installed() {
    if ! command -v fswatch >/dev/null 2>&1; then
        echo "fswatch is not installed. Installing now..."
        
        # Detect the OS
        case "$(uname -s)" in
            Darwin)
                brew install fswatch
                ;;
            Linux)
                sudo apt-get update
                sudo apt-get install -y fswatch
                ;;
            *)
                echo "Unsupported OS. Please install fswatch manually."
                exit 1
                ;;
        esac

        if [[ $? -ne 0 ]]; then
            echo "Error installing fswatch. Exiting..."
            exit 1
        fi
    fi
}

# If the script is called with --watch
if [[ "$1" == "--watch" ]]; then
    ensure_fswatch_installed
    echo "Watching for changes in $ROOT_DIR..."
    fswatch -r --include ".*endpoint\.ts$" --exclude ".*" "$ROOT_DIR" | while read f; do
        echo "Change detected in $f. Running export..."
        run_export
    done

else
    run_export
fi