const suites = [];
const suiteStack = [];

function describe(name, fn) {
  const suite = { name, tests: [] };
  if (suiteStack.length === 0) {
    suites.push(suite);
  } else {
    suiteStack[suiteStack.length - 1].tests.push({ name, type: "suite", suite });
  }
  suiteStack.push(suite);
  try {
    fn();
  } finally {
    suiteStack.pop();
  }
}

function it(name, fn) {
  const current = suiteStack[suiteStack.length - 1];
  if (!current) {
    throw new Error("it() must be called within describe()");
  }
  current.tests.push({ name, fn, type: "test" });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expect(received) {
  return {
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(received - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      assert(diff <= tolerance, `${received} is not within ${precision} decimals of ${expected}`);
    },
    toBeGreaterThan(expected) {
      assert(received > expected, `${received} is not greater than ${expected}`);
    },
    toBeLessThan(expected) {
      assert(received < expected, `${received} is not less than ${expected}`);
    },
    toBe(expected) {
      assert(Object.is(received, expected), `${received} is not strictly equal to ${expected}`);
    },
  };
}

async function runSuite(suite, level = 0) {
  const indent = "".padStart(level * 2, " ");
  console.log(`${indent}${suite.name}`);
  let passed = 0;

  for (const entry of suite.tests) {
    if (entry.type === "suite") {
      const result = await runSuite(entry.suite, level + 1);
      passed += result.passed;
      continue;
    }

    try {
      await entry.fn();
      console.log(`${indent}  \u2713 ${entry.name}`);
      passed += 1;
    } catch (error) {
      console.error(`${indent}  \u2717 ${entry.name}`);
      console.error(error instanceof Error ? error.message : error);
      throw error;
    }
  }

  return { passed };
}

async function runSuites() {
  let total = 0;
  for (const suite of suites) {
    const { passed } = await runSuite(suite);
    total += passed;
  }
  console.log(`\nAll ${total} test(s) passed.`);
}

module.exports = { describe, it, expect, runSuites };
