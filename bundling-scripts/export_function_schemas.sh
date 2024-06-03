#!/bin/bash



export_function_schemas() {
    local ROOT_DIR="$1"
    local OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN="$2"
    local zod_package="$3"
    local supabaseclient_package="$4"



    # Make sure the imports will still point to the same place, when moved to the output folder 
    update_imports_to_output_dir() {
        local ENDPOINT_FILES="$1"
        local OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS="$2"

        # Ensure realpath is installed
        if ! command -v realpath > /dev/null 2>&1; then
            echo "realpath is not installed. Attempting to install..."
            
            OS="$(uname)"
            case $OS in
            "Linux")
                # Check if apt is available
                if command -v apt > /dev/null 2>&1; then
                    sudo apt update
                    sudo apt install -y coreutils
                else
                    echo "Unsupported package manager on Linux. Please install realpath manually."
                    exit 1
                fi
                ;;
            "Darwin") # macOS
                # Check if brew is available
                if ! command -v brew > /dev/null 2>&1; then
                    echo "Homebrew is not installed on your Mac. Installing..."
                    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                fi
                brew install coreutils
                ;;
            *)
                echo "Unsupported OS. Please install realpath manually."
                exit 1
                ;;
            esac

            # Check again to ensure installation was successful
            if ! command -v realpath > /dev/null 2>&1; then
                echo "Error: Failed to install realpath. Exiting..."
                exit 1
            fi
        fi

        # Function to adjust import paths, so they're relatively correct after moving to the output directory 
        adjust_import_path() {
            local import_path="$1"
            local original_dir="$2"
            local target_dir=$(dirname "$OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS")

            # If import path is absolute or from an external URL, just return it
            [[ $import_path != .* || $import_path == http* ]] && echo "$import_path" && return

            # Adjust the relative path using realpath
            new_path=$(realpath --relative-to="$target_dir" "$original_dir/$import_path")

            echo "$new_path"
        }


        # Placeholder for unique import statements
        IMPORTS=""

        # Loop through each endpoint file
        for file in $ENDPOINT_FILES; do
            # Extract import statements and adjust their paths
            imports_from_file=$(awk '/^import /{print}' $file)
            while IFS= read -r line; do
                import_path=$(echo "$line" | sed -n 's/^import .*from "\(.*\)";$/\1/p')
                adjusted_path=$(adjust_import_path "$import_path" "$(dirname "$file")")
                #adjusted_import=$(echo "$line" | sed "s#$import_path#$adjusted_path#")
                adjusted_import=$(echo "$line" | perl -pe "s#\Q$import_path\E#$adjusted_path#g")
                IMPORTS+="$adjusted_import\n"
            done <<< "$imports_from_file"
        done


        # Ensure only unique import statements are added
        printf "$IMPORTS\n" | sort | uniq > tmp_imports.txt
        IMPORTS=$(cat tmp_imports.txt)
        rm tmp_imports.txt

        # Append the unique import statements to the output file
        printf "%s\n\n" "$IMPORTS" > $OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS

    }

    add_endpoints_to_a_shared_endpoint_map() {
        local ENDPOINT_FILES="$1"
        local OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS="$2"

        # Placeholders for the various data maps
        SCHEMAS_MAP="export const EndpointSchemasMap = {"
        SCHEMAS_MAP+=$'\n'
        TYPES_MAP="export type EndpointTypesMap = {"
        TYPES_MAP+=$'\n'

        for file in $ENDPOINT_FILES; do
            # Extract directory name which will be the endpoint name
            ENDPOINT_NAME=$(basename $(dirname $file))

            # Convert dashes to underscores for safe JS variable names
            NAMESPACE_PREFIX=$(echo $ENDPOINT_NAME | sed 's/-/_/g' | awk 'BEGIN{FS=OFS="_"} {for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')_

            # Modify the content of the file in memory (removing imports and renaming EndpointSchemas)
            MODIFIED_CONTENT=$(perl -p -e "next if /^import/; s/const EndpointSchemas =/const ${NAMESPACE_PREFIX}EndpointSchemas =/" "$file")

            # Extract the content of EndpointSchemas for processing from the modified content
            SCHEMA_CONTENT=$(echo "$MODIFIED_CONTENT" | perl -0777 -ne "if (/const ${NAMESPACE_PREFIX}EndpointSchemas = (.*?)(\n}|\};)/s) { print \"const ${NAMESPACE_PREFIX}EndpointSchemas = \$1\$2\" }")

            # Append the modified content to the output file
            echo "$MODIFIED_CONTENT" >> $OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS

            # Extract the keys (e.g., GET, POST) from the SCHEMA_CONTENT
            KEYS=$(echo "$SCHEMA_CONTENT" | awk -F':' '/^[[:space:]]*'\''[A-Z]+[[:space:]]*'\'':/{gsub(/'\''/,""); gsub(/[[:space:]]+/,""); print $1}')

            #REPLACED_WITH_FLAT# Generate the type EndpointTypes using the extracted keys
            #REPLACED_WITH_FLATTYPES_DATA="type ${NAMESPACE_PREFIX}EndpointTypes = {\n"
            #REPLACED_WITH_FLATfor key in $KEYS; do
            #REPLACED_WITH_FLAT    TYPES_DATA+="    '$key': {\n"
            #REPLACED_WITH_FLAT    TYPES_DATA+="        request: z.infer<typeof ${NAMESPACE_PREFIX}EndpointSchemas.$key.request>,\n"
            #REPLACED_WITH_FLAT    TYPES_DATA+="        response: z.infer<typeof ${NAMESPACE_PREFIX}EndpointSchemas.$key.response>\n"
            #REPLACED_WITH_FLAT    TYPES_DATA+="    },\n"
            #REPLACED_WITH_FLATdone
            #REPLACED_WITH_FLATTYPES_DATA+="};\n\n"
            #REPLACED_WITH_FLAT# Add the endpoint name to the Types
            #REPLACED_WITH_FLATTYPES_MAP+="    '$ENDPOINT_NAME': ${NAMESPACE_PREFIX}EndpointTypes,\n"

            # Generate the type EndpointTypes using the extracted keys
            # It needs flattening for TypeScript to work, e.g. for a request check, EndpointTypes['view-bundle']['POST'].request would fail, because so much nesting means it can never trust 'request' would be there. So flatten it to EndpointTypes['view-bundle::POST'].request. 
            
            for key in $KEYS; do
                TYPES_MAP+="    '$ENDPOINT_NAME::$key': {"
                TYPES_MAP+=$'\n'
                TYPES_MAP+="        request: z.infer<typeof ${NAMESPACE_PREFIX}EndpointSchemas.$key.request>,"
                TYPES_MAP+=$'\n'
                TYPES_MAP+="        response: z.infer<typeof ${NAMESPACE_PREFIX}EndpointSchemas.$key.response>"
                TYPES_MAP+=$'\n'
                TYPES_MAP+="    }"
                TYPES_MAP+=$'\n'
            done


            # Add the directory's name (i.e., endpoint name) to the Schemas 
            SCHEMAS_MAP+="    '$ENDPOINT_NAME': ${NAMESPACE_PREFIX}EndpointSchemas,"
            SCHEMAS_MAP+=$'\n'

            # Append to the output file
            printf "%s\n" "$TYPES_DATA" >> $OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS
        done

        # Finalize the Schemas and Types maps
        SCHEMAS_MAP+="};"
        SCHEMAS_MAP+=$'\n\n'
        TYPES_MAP+="};"
        TYPES_MAP+=$'\n\n'

        # Append the finalized maps to the output file
        printf "%s%s" "$SCHEMAS_MAP" "$TYPES_MAP" >> $OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS
    }

    # Follow the remaining import statements in the output file, to fold them all into one file 
    rollup_imported_ts_files() {
        local entry_file="$1"
        local output_file="$2"

        # Ensure valid parameters
        if [[ -z "$entry_file" || -z "$output_file" ]]; then
            echo "Usage: rollup_imported_ts_files <entry_file> <output_file>"
            return 1
        fi

        # Visited files
        local visited_files="./visited_files.log"

        # Initialize the output and visited files
        if [ ! -f "$output_file" ]; then
            > "$output_file"
        fi

        if [ ! -f "$visited_files" ]; then
            > "$visited_files"
        fi

        # Reset the output file
        > "$output_file"

        # Recursively process the file
        process_file() {
            local current_file="$1"
            local abs_path

            # Resolve to absolute path using readlink
            abs_path=$(readlink -f "$current_file")

            # Check if file has already been visited
            if grep -q "$abs_path" "$visited_files"; then
                return
            fi

            # Extract and process relative imports first to ensure they are on top
            grep 'import .*from "\.\(\./\)*.*\.ts"' "$current_file" | sed -n 's/.*"\(.*\.ts\)".*/\1/p' | while read -r line; do
                local dir
                dir=$(dirname "$current_file")
                process_file "${dir}/${line#./}"
            done

            # Concatenate the current file's contents to output, excluding relative imports
            awk '!/import .*from "\..*\.ts"/' "$current_file" >> "$output_file"

            # Mark the file as visited only after processing it fully
            echo "$abs_path" >> "$visited_files"
        }

        # Start processing the input file
        process_file "$entry_file"

        # Cleanup
        rm "$visited_files"

        # Remove duplicated import lines
        awk '!/import / { print; next } !seen[$0]++' "$output_file" > temp_output.ts && mv temp_output.ts "$output_file"
    }

    use_approved_imports() {
        local input_file="$1"
        local output_file="$2"
        local z_package="$3"
        local supabaseclient_package="$4"

        # Check for the existence of the input file
        if [[ ! -f "$input_file" ]]; then
            echo "Input file '$input_file' not found!"
            return 1
        fi

        # Read the input file into a variable, excluding import lines
        local content
        content=$(grep -v '^import ' "$input_file")

        # Define the approved imports
        local approved_imports=$(cat <<- EOM
import z, {ZodType} from '${z_package}';
import { SupabaseClient, FunctionsHttpError } from '${supabaseclient_package}';
EOM
        )

        # Combine the approved imports and the content
        original_content="$content"
        content="${approved_imports}"
        content+=$'\n\n'
        content+="${original_content}"

        # Write the combined content to the output file
        printf "%s\n" "$content" > "$output_file"
    }

    function append_clientconsumers_typescript() {
        OUTPUT_FILE="$1"
        # Check if a target filename is provided
        if [[ -z "$OUTPUT_FILE" ]]; then
            printf "Please provide the target filename as an argument.\n"
            return 1
        fi


        local SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
        local CCFILE="$SCRIPT_DIR/client-consumers.ts"

        # Check if 'client-consumers.ts' exists
        if [[ ! -f "$CCFILE" ]]; then
            printf "$CCFILE does not exist in the current directory.\n"
            return 1
        fi

        # Read 'client-consumers.ts', remove lines containing the placeholder, and append to target file
        grep -v "#EXPORT-REMOVE-PLACEHOLDER" "$CCFILE" >> "$OUTPUT_FILE"
    }




    # START 

    OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS="${OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN}.part"

    # Make sure the directory exists 
    OUTPUT_DIR=$(dirname $OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS)
    if [ ! -d "$OUTPUT_DIR" ]; then
        mkdir -p "$OUTPUT_DIR"
    fi


    # Reset (i.e., empty out) the output file 
    > $OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS
    > $OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN

    # Collect all the endpoint files (one for each endpoint/function)
    ENDPOINT_FILES=$(find $ROOT_DIR -type f -name "*endpoint.ts")

    update_imports_to_output_dir "$ENDPOINT_FILES" "$OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS"

    add_endpoints_to_a_shared_endpoint_map "$ENDPOINT_FILES" "$OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS"

    rollup_imported_ts_files "$OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS" "$OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN"
    
    # Cleanup 
    rm "$OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS"

    use_approved_imports "$OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN" "${OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN}" "${zod_package}" "${supabaseclient_package}"
    
    append_clientconsumers_typescript "$OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN"

    echo "EndPoint map created at $OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN"
    
}


#ROOT_DIR="../../../../../"
#OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN="${ROOT_DIR}supabase/exports/endpoint_types/EndpointMapFinal.ts"
#export_function_schemas "$ROOT_DIR" "$OUTPUT_TS_FILE_WITH_ENDPOINT_MAPS_AND_IMPORTS_ROLLED_IN"