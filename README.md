# JS Workspace

This is just an in-browser javascript runner. This solves what? Idk tbh but it allows me to run scripts when I cant install stuff in my PC.

Demo: https://js.noob31.com/

Full Disclosure: This was made using AI assistance.

### Features

- Automatic parameter and args detection
- Supports runtime input
- Console view
- Supports files and attachments (fs/path)
- Extension bridge for request fetching 
- Node support without installation

### Build and Run

Using Node.js

```
npm i
npm run build
```
Serves from `dist`.

```npm run dev``` for development. 

Serves from `http://localhost:3000`

### Credits & Open Source Engines

- **[Acorn](https://github.com/acornjs/acorn)** & **[@babel/parser](https://github.com/babel/babel)** for standard ECMAScript, TypeScript, and AST parameter parsing.
- **[buffer](https://github.com/feross/buffer)**, **[path-browserify](https://github.com/browserify/path-browserify)**, and **[events](https://github.com/browserify/events)** for browser Node.js standard library polyfills.
- **[Monaco Editor](https://github.com/microsoft/monaco-editor)** for the in-browser code editor.

