/**
 * Runtime User Input Test Suite (Async/Await Compatible)
 * Designed for testing interactive prompt handling in web worker execution engines.
 * 
 * Tests input categories:
 * 1. Text String Inputs
 * 2. Numeric / Integer Inputs
 * 3. Boolean / Flag Confirmation Inputs
 * 4. Choice / Option Selection Inputs
 * 5. JSON / Structured Data Inputs
 * 
 * Correctly awaits async prompt() resolution from the browser engine UI.
 * Writes full test results report to 'interactive_input_test_results.txt'.
 */

import fs from 'fs';

(async function runInteractiveInputTestSuite(args = {}) {
  const results = [];
  const fsMod = fs || globalThis.fs;

  function log(msg) {
    console.log(`[INTERACTIVE TEST] ${msg}`);
  }

  /**
   * Helper to prompt user (awaiting async prompt return) or pick fallback
   */
  async function getUserInput(promptMessage, defaultValue, optionKey) {
    // 1. Check if passed via runtime args object
    if (args && args[optionKey] !== undefined) {
      log(`Received argument for '${optionKey}': ${args[optionKey]}`);
      return args[optionKey];
    }
    // 2. Try global async prompt() if available in runtime engine
    if (typeof prompt === 'function') {
      try {
        log(`Triggering prompt: "${promptMessage}" (Default: "${defaultValue}")`);
        const inputPromise = prompt(promptMessage, String(defaultValue));
        const input = (inputPromise && typeof inputPromise.then === 'function')
          ? await inputPromise
          : inputPromise;

        if (input !== null && input !== undefined && input !== '') {
          return input;
        }
      } catch (e) {
        log(`prompt() exception for '${optionKey}': ${e.message}`);
      }
    }
    // 3. Fallback to default
    log(`Using default input value for '${optionKey}': ${defaultValue}`);
    return defaultValue;
  }

  log('Starting Interactive User Input Test Suite Execution...');

  // ----------------------------------------------------
  // TEST 1: String Input Processing (User / App Name)
  // ----------------------------------------------------
  try {
    const rawAppName = await getUserInput(
      'Enter Target Application Name:',
      'TestRunnerApp',
      'appName'
    );
    const sanitizedAppName = String(rawAppName).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    results.push({
      testName: 'Text String Input & Sanitization',
      category: 'String Input',
      inputProvided: rawAppName,
      processedOutput: sanitizedAppName,
      status: sanitizedAppName.length > 0 ? 'PASSED' : 'FAILED',
      notes: `Sanitized string output: '${sanitizedAppName}'`
    });
  } catch (err) {
    results.push({
      testName: 'Text String Input & Sanitization',
      category: 'String Input',
      status: 'FAILED',
      error: err.message
    });
  }

  // ----------------------------------------------------
  // TEST 2: Numeric Input & Range Validation
  // ----------------------------------------------------
  try {
    const rawPort = await getUserInput(
      'Enter Server Port (1024 - 65535):',
      '8080',
      'serverPort'
    );
    const parsedPort = parseInt(String(rawPort), 10);
    const isValidPort = !isNaN(parsedPort) && parsedPort >= 1024 && parsedPort <= 65535;
    
    results.push({
      testName: 'Numeric Input & Boundary Validation',
      category: 'Numeric Input',
      inputProvided: rawPort,
      processedOutput: isNaN(parsedPort) ? null : parsedPort,
      status: isValidPort ? 'PASSED' : 'FAILED',
      notes: isValidPort ? `Valid port parsed: ${parsedPort}` : `Invalid port value: ${rawPort}`
    });
  } catch (err) {
    results.push({
      testName: 'Numeric Input & Boundary Validation',
      category: 'Numeric Input',
      status: 'FAILED',
      error: err.message
    });
  }

  // ----------------------------------------------------
  // TEST 3: Boolean Confirmation / Feature Flag Input
  // ----------------------------------------------------
  try {
    const rawConfirm = await getUserInput(
      'Enable Advanced Debug Mode? (true/false/y/n):',
      'true',
      'enableDebug'
    );
    const normalizedStr = String(rawConfirm).trim().toLowerCase();
    const isConfirmed = normalizedStr === 'true' || normalizedStr === 'yes' || normalizedStr === 'y' || normalizedStr === '1';
    
    results.push({
      testName: 'Boolean Flag Normalization',
      category: 'Boolean Input',
      inputProvided: rawConfirm,
      processedOutput: isConfirmed,
      status: 'PASSED',
      notes: `Normalized boolean value: ${isConfirmed}`
    });
  } catch (err) {
    results.push({
      testName: 'Boolean Flag Normalization',
      category: 'Boolean Input',
      status: 'FAILED',
      error: err.message
    });
  }

  // ----------------------------------------------------
  // TEST 4: Choice / Select Option Input
  // ----------------------------------------------------
  try {
    const validEnvironments = ['development', 'staging', 'production', 'testing'];
    const rawEnv = await getUserInput(
      `Select Target Environment (${validEnvironments.join('/')}):`,
      'development',
      'environment'
    );
    const chosenEnv = String(rawEnv).trim().toLowerCase();
    const isValidChoice = validEnvironments.includes(chosenEnv);

    results.push({
      testName: 'Choice Option Matching',
      category: 'Choice Input',
      inputProvided: rawEnv,
      processedOutput: chosenEnv,
      status: isValidChoice ? 'PASSED' : 'FAILED',
      notes: isValidChoice ? `Environment matched: ${chosenEnv}` : `Invalid choice '${rawEnv}'`
    });
  } catch (err) {
    results.push({
      testName: 'Choice Option Matching',
      category: 'Choice Input',
      status: 'FAILED',
      error: err.message
    });
  }

  // ----------------------------------------------------
  // TEST 5: Structured JSON Configuration Input
  // ----------------------------------------------------
  try {
    const defaultJsonConfig = '{"timeout": 5000, "retries": 3, "headers": {"X-Custom": "Test"}}';
    const rawJson = await getUserInput(
      'Enter Config Payload (JSON):',
      defaultJsonConfig,
      'configJson'
    );
    const parsedConfig = JSON.parse(String(rawJson));
    const hasKeys = parsedConfig && typeof parsedConfig === 'object' && 'timeout' in parsedConfig;

    results.push({
      testName: 'Structured JSON Input Parsing',
      category: 'JSON Input',
      inputProvided: rawJson,
      processedOutput: parsedConfig,
      status: hasKeys ? 'PASSED' : 'FAILED',
      notes: `Parsed JSON keys: ${Object.keys(parsedConfig).join(', ')}`
    });
  } catch (err) {
    results.push({
      testName: 'Structured JSON Input Parsing',
      category: 'JSON Input',
      status: 'FAILED',
      error: err.message
    });
  }

  // ----------------------------------------------------
  // TEST 6: Interactive Re-prompt Retry Loop on Garbage Input
  // ----------------------------------------------------
  try {
    let validPort = null;
    let attempts = 0;
    const maxAttempts = 5;
    const inputsProvided = [];

    while (validPort === null && attempts < maxAttempts) {
      attempts++;
      const promptMsg = attempts === 1
        ? '[RE-PROMPT TEST] Enter a valid numeric port (1024 - 65535):'
        : `[RE-PROMPT ATTEMPT ${attempts}/${maxAttempts}] Invalid input! Please enter a valid number (1024 - 65535):`;
      
      const raw = await getUserInput(
        promptMsg,
        attempts === 1 ? '8080' : '9090',
        `retryPort_attempt${attempts}`
      );
      inputsProvided.push(raw);

      const parsed = parseInt(String(raw), 10);
      if (!isNaN(parsed) && parsed >= 1024 && parsed <= 65535) {
        validPort = parsed;
        log(`✓ Valid port ${validPort} received after ${attempts} attempt(s).`);
      } else {
        log(`✗ Attempt ${attempts} received invalid input '${raw}'. Re-prompting...`);
      }
    }

    const isPassed = validPort !== null;
    results.push({
      testName: 'Re-prompt Loop Retry on Garbage Input',
      category: 'Retry Validation Loop',
      inputProvided: inputsProvided,
      processedOutput: validPort,
      status: isPassed ? 'PASSED' : 'FAILED',
      notes: isPassed
        ? `Accepted valid port ${validPort} after ${attempts} attempt(s). Input history: ${JSON.stringify(inputsProvided)}`
        : `Failed to receive valid port after ${maxAttempts} attempt(s). Input history: ${JSON.stringify(inputsProvided)}`
    });
  } catch (err) {
    results.push({
      testName: 'Re-prompt Loop Retry on Garbage Input',
      category: 'Retry Validation Loop',
      status: 'FAILED',
      error: err.message
    });
  }

  // ----------------------------------------------------
  // REPORT SUMMARY & WRITE TO FILE
  // ----------------------------------------------------
  const reportLines = [
    '==================================================',
    '       RUNTIME USER INPUT TEST SUITE REPORT        ',
    '==================================================',
    `Timestamp: ${new Date().toISOString()}`,
    `Total Interactive Tests: ${results.length}`,
    '--------------------------------------------------',
    'TEST RESULTS SUMMARY:',
    '--------------------------------------------------'
  ];

  let passed = 0;
  results.forEach((r, i) => {
    if (r.status === 'PASSED') passed++;
    reportLines.push(`[${i + 1}] [${r.status}] [${r.category}] ${r.testName}`);
    reportLines.push(`    Input Provided: ${JSON.stringify(r.inputProvided)}`);
    reportLines.push(`    Output Processed: ${JSON.stringify(r.processedOutput)}`);
    reportLines.push(`    Notes: ${r.notes || 'N/A'}`);
    if (r.error) {
      reportLines.push(`    Error: ${r.error}`);
    }
    reportLines.push('--------------------------------------------------');
  });

  reportLines.push(`Final Result: ${passed}/${results.length} tests passed.`);
  reportLines.push('==================================================');

  const reportText = reportLines.join('\n');
  const outputFile = 'interactive_input_test_results.txt';

  if (fsMod && fsMod.writeFileSync) {
    fsMod.writeFileSync(outputFile, reportText, 'utf-8');
    log(`Interactive test report successfully written to '${outputFile}'`);
  } else {
    log(`WARNING: 'fs' module unavailable. Outputting report to console:`);
    console.log(reportText);
  }

  return { passedCount: passed, total: results.length, results };
})();
