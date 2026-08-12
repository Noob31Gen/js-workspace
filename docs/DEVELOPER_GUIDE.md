# Developer Guide & Customization

This guide provides instructions on building, extending, and deploying the **JS Workspace** application.

---

## 1. Project Setup & Local Development

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm / yarn

### Installation
```bash
cd js-workspace
npm install
```

### Dev Mode
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

---

## 2. Design System & Styling (Tailwind CSS v4)

This template adheres to the design language of **Noob31's MultiTools**:
- **Theme Variables**: CSS variables defined in `src/index.css` (`--background`, `--foreground`, `--primary`, `--muted`, `--border`).
- **Dark Mode First**: Enabled by default via class `dark` on `<html>`.
- **Icons**: Lucide icons (`lucide-react`).
- **Typography**: `@fontsource-variable/geist` font family.

---

## 3. Adding New Features or Prebuilt Tool Pages

To add a new tool or workspace view (similar to Noob31's MultiTools):

1. **Create a Component**: Add `src/components/tools/MyCustomTool.tsx`.
2. **Add a Route**: Update `src/App.tsx` routes.
3. **Register in Sidebar**: Add an entry into `src/components/layout/Sidebar.tsx`.

---

## 4. Production Build

To bundle the web app for production deployment (Vercel, Netlify, GitHub Pages, or static hosting):

```bash
npm run build
```
The optimized HTML/JS/CSS assets will be generated in `dist/`.
