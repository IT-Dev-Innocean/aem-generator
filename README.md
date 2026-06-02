# Article HTML Generator

Internal platform to convert article content (Google Docs / Microsoft Word /
SharePoint / OneDrive / uploaded files) into **KIA-style article HTML** ready
to copy-paste into the CMS — without manually creating new HTML files.

Output matches the format used in `/KIA/*.html`:

- `<h2 style="font-weight: 700;">` & `<h3 style="font-weight: 700;">`
- `<span style="font-weight: 700;">` for bold, `<i>` for italic
- `<a href style="color: rgb(0, 170, 210); text-decoration: none;">` for links
- `<ul style="margin-left: 25px;">` + `<li style="list-style: disc;">`
- `<ol style="margin-left: 25px;">` + `<li style="list-style: decimal;">`
- Spacer `<p>&nbsp;</p>` between every block

## Tech Stack

- **React 18** + **TypeScript**
- **Vite 6** (dev server & build)
- **Tailwind CSS v4**
- **Radix UI** (Tabs, Switch, Tooltip, Toast, Label, Separator)
- **TanStack React Query** (generate state)
- **Monaco Editor** (VS Code-style editor with syntax highlighting & themes)
- **mammoth** (DOCX → HTML), **pdfjs-dist** (PDF text extraction)

## Getting Started

```bash
cd generate-article
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:5173`).

### Workflow

1. Choose a content source:
   - **Document Link** — paste a **Google Docs** URL or a **Microsoft Word** sharing link from **SharePoint / OneDrive** (must be shared as "Anyone with the link").
   - **Upload File** — drag & drop or select `.docx`, `.pdf`, `.html`, `.txt`, `.md`.
2. Click **Generate HTML**.
3. The platform automatically:
   - **Removes** **SEO Meta Data** blocks (Title Tag, Meta Description, etc.).
   - **Splits** bilingual content into **2 separate files** (ID & EN) when detected.
4. Review output in **HTML Code** (VS Code-style editor) and **Preview** tabs.
5. **Edit** the code if needed, then **Copy** or **Download** per file or all files.

### ID & EN version detection

The platform splits documents when it finds either pattern:

- Heading markers: `Version ID`, `Version EN`, `Bahasa Indonesia`, `English Version`, `[ID]`, `[EN]`, etc.
- Two consecutive **SEO Meta Data** blocks (common Google Docs pattern): content after the first SEO block = ID, after the second = EN.

## Notes

- **Google Docs / Microsoft links via browser** use a built-in dev/preview proxy (`/api/proxy-fetch`) to bypass CORS. Use `npm run dev` or `npm run preview`. For static hosting without a server, download `.docx` and use **Upload File**.
- **PDF** only extracts text; heading structure may need minor manual cleanup
  in the editor.

## Production Build

```bash
npm run build
npm run preview
```
