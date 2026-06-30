#!/bin/bash

# 1. Define the array of versions you want to test
VERSIONS=("v1" "v2" "v3" "v4" "v5")

# Path to your test script
TEST_SCRIPT="./src/__tests__/load-test.ts"

echo "🚀 Starting sequential load tests for versions: ${VERSIONS[*]}"
echo "--------------------------------------------------------"

# 2. Loop through each version in the array
for VERSION in "${VERSIONS[@]}"; do
    echo "⏱️  Running load test for: $VERSION"

    # 3. Execute the k6 command
    # Using the --summary-export flag ensures we save the data for our comparison script later
    k6 run -e VERSION="$VERSION" "$TEST_SCRIPT"

    # Check if the command succeeded
    if [ $? -eq 0 ]; then
        echo "✅ Finished $VERSION."
    else
        echo "❌ Error encountered during the $VERSION test run."
    fi

    echo "--------------------------------------------------------"

    # Optional pacing: cooldown period (e.g., 5 seconds) to let your DB settle
    echo "Waiting 5 seconds for database connection cooldown..."
    sleep 5
done

echo "🎉 All load tests have completed!"
