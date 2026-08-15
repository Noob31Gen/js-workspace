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

### Credits

- **almostnode** (https://github.com/macaly/almostnode) for the comprehensive browser-native Node.js runtime shims and module compatibility layer.

