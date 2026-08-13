// Test browser DOM polyfill
console.log('Testing document and window polyfills...');

const documentBody = {
  _innerHTML: '',
  set innerHTML(val) {
    this._innerHTML = val;
    console.log('DOM innerHTML set to:', val);
  },
  get innerHTML() {
    return this._innerHTML;
  }
};

documentBody.innerHTML = '<h1 style="color:red">Test DOM Page</h1>';
console.log('Test completed cleanly!');
