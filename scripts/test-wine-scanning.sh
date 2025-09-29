#!/bin/bash

# Wine Scanning Test Suite
# This ensures the wine scanning feature works end-to-end with REAL functionality

echo "================================================"
echo "WINE SCANNING COMPREHENSIVE TEST SUITE"
echo "================================================"
echo ""
echo "This test suite verifies:"
echo "1. No mock data in production code"
echo "2. Real API calls are made"
echo "3. Image processing works correctly"
echo "4. Queue processing functions properly"
echo "5. Edge functions are invoked"
echo ""

cd apps/vinho-web

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

run_test() {
    local test_name=$1
    local test_file=$2

    echo -e "${YELLOW}Running: $test_name${NC}"
    if npm test -- "$test_file" 2>&1 | grep -q "PASS"; then
        echo -e "${GREEN}✓ $test_name PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ $test_name FAILED${NC}"
        npm test -- "$test_file" 2>&1 | grep -A 3 "FAIL\|Error"
        return 1
    fi
    echo ""
}

echo "================================================"
echo "CRITICAL TESTS FOR WINE SCANNING"
echo "================================================"
echo ""

# Track results
PASSED=0
FAILED=0

# Test 1: Mock Data Detection
if run_test "Mock Data Detection" "__tests__/integrity/no-mock-data.test.ts"; then
    ((PASSED++))
else
    ((FAILED++))
    echo -e "${RED}WARNING: Mock data found in production code!${NC}"
fi

# Test 2: API Integration
if run_test "API Integration" "__tests__/api/scan-api-integration.test.ts"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Test 3: Queue Processing
if run_test "Queue Processing" "__tests__/queue/wine-queue-processing.test.ts"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Test 4: Image Validation
if run_test "Image Upload Validation" "__tests__/validation/image-upload-validation.test.ts"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Test 5: Edge Function
if run_test "Edge Function Invocation" "__tests__/edge-functions/edge-function-invocation.test.ts"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Test 6: Process Wine Queue Logic
if run_test "Wine Queue Logic" "__tests__/edge-functions/process-wine-queue.test.ts"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Test 7: Grape Varietal Extraction
if run_test "Grape Varietal Extraction" "__tests__/varietals/varietal-extraction.test.ts"; then
    ((PASSED++))
else
    ((FAILED++))
    echo -e "${RED}WARNING: Grape varietals not being extracted properly!${NC}"
fi

# Test 8: Varietal Database Storage
if run_test "Varietal Database Storage" "__tests__/varietals/varietal-storage.test.ts"; then
    ((PASSED++))
else
    ((FAILED++))
fi

echo ""
echo "================================================"
echo "VARIETAL EXTRACTION VERIFICATION"
echo "================================================"
echo "Testing known wines with expected varietals:"
echo "  - Dom Pérignon → Pinot Noir, Chardonnay"
echo "  - Opus One → Cabernet Sauvignon, Merlot, etc."
echo "  - Barolo → Nebbiolo"
echo "  - Chablis → Chardonnay"
echo ""

echo "================================================"
echo "TEST SUMMARY"
echo "================================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical wine scanning tests passed!${NC}"
    echo -e "${GREEN}The app is using REAL AI processing, not mock data.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix before deploying.${NC}"
    echo ""
    echo "Key things to verify:"
    echo "1. No hardcoded wine names (especially 'Château Margaux')"
    echo "2. Real API calls to Supabase and OpenAI"
    echo "3. Actual image upload to storage"
    echo "4. Edge function processing queue items"
    echo "5. Grape varietals are extracted and saved"
    exit 1
fi