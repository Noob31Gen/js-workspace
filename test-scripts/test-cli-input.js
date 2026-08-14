// Test script for CLI user input polyfills: readline, readline/promises, prompt, process.stdin

console.log('=== Automated Test: CLI Input Polyfills ===');

let userInputQueue = ['Alice', 'Music Transfer', '2026'];

function requestUserInput(promptMsg) {
  console.log('INPUT REQUEST FIRED:', promptMsg);
  return new Promise(resolve => {
    // Simulate user entering input from UI after short delay
    setTimeout(() => {
      const val = userInputQueue.shift() || 'default';
      console.log('USER SUBMITTED INPUT:', val);
      resolve(val);
    }, 10);
  });
}

// Test readline polyfill
const readlineModule = {
  createInterface: function() {
    var rl = {};
    rl.question = function(query, cb) {
      return requestUserInput(query).then(function(ans) {
        if (typeof cb === 'function') cb(ans);
        return ans;
      });
    };
    return rl;
  }
};

async function testScript() {
  const rl = readlineModule.createInterface();
  const name = await rl.question('Enter name: ');
  console.log('Greeting output: Hello ' + name);

  const project = await requestUserInput('Enter project: ');
  console.log('Project output: ' + project);

  return { name, project };
}

testScript().then(res => {
  console.log('Test completed successfully:', res);
});
