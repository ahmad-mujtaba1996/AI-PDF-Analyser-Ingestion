# AI PDF Ingestion Pipeline

A production-style NestJS application that turns any uploaded PDF into
AI-ready knowledge: parsed text → clean Markdown → metadata → a Gemini
2.5 Flash-generated summary, topic list, and key points.

Built as a teaching project for an AI Engineering course — everything runs
from the browser, in memory, with no database and no external tools like
Postman required.

---

## 1. Install dependencies

```bash
npm install
```

## 2. Configure your Gemini API key

Copy the example env file and fill in your key:

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY=YOUR_API_KEY
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
MAX_FILE_SIZE_BYTES=15728640
```

Get a free key at **https://aistudio.google.com/apikey**. Never commit
`.env` — it's already listed in `.gitignore`.

## 3. Run the project

```bash
npm run start:dev
```

You should see:

```
🚀 AI PDF Ingestion Pipeline is running
   Local:  http://localhost:3000
   Upload API: POST http://localhost:3000/ai/upload
```

## 4. Open the browser

Go to **http://localhost:3000**

## 5. Test it

1. Click the upload area (or drag a PDF onto it).
2. Click **Analyze PDF**.
3. Watch the pipeline stages light up: uploading → parsing → converting →
   extracting metadata → cleaning → asking Gemini → complete.
4. Review the results: metadata cards, generated Markdown, AI summary,
   topic badges, and key points.

No Postman or Thunder Client needed — the whole flow is driven from the
webpage using `fetch()` and `FormData`.

---

## Project structure

```
src/
  main.ts                          Bootstraps Nest, wires global pipes/filters
  app.module.ts                    Root module: config, static frontend, AiModule

  ai/
    ai.module.ts                   Wires controller + service + GeminiModule
    ai.controller.ts                POST /ai/upload — the only API route
    ai.service.ts                   Orchestrates the pipeline end to end
    dto/
      upload-response.dto.ts       Shape of the JSON returned to the frontend
    utils/
      pdf-parser.util.ts           Step 2+3: parse PDF buffer -> raw text
      text-cleaner.util.ts         Step 6: normalize/clean raw text
      markdown-converter.util.ts   Step 4: cleaned text -> Markdown
      metadata-extractor.util.ts   Step 5: file name, pages, words, size
    gemini/
      gemini.module.ts             Isolates the LLM provider behind one service
      gemini.service.ts            Step 7: calls Gemini 2.5 Flash, parses JSON

  common/
    filters/http-exception.filter.ts   Turns every error into one JSON shape
    pipes/pdf-file-validation.pipe.ts  Rejects missing/empty/non-PDF uploads

public/
  index.html                       Frontend markup (5 result sections)
  style.css                        Dark "engineering lab" themed UI
  script.js                        Upload flow, staged status animation, rendering
```

### Why it's organized this way

- **Controller** (`ai.controller.ts`) is a thin HTTP layer: it only handles
  the file upload and delegates everything else to `AiService`.
- **Service** (`ai.service.ts`) is the orchestrator — it calls each pipeline
  step in order and assembles the final response. It has no HTTP or PDF
  parsing knowledge of its own.
- **Utils** are small, pure(ish) functions — each one does exactly one job
  (parse, clean, convert, extract) and can be unit-tested in isolation
  without spinning up Nest or mocking HTTP.
- **GeminiService** is the only place that talks to the `@google/genai`
  SDK. If you ever swap to a different model provider, this is the only
  file that needs to change.
- **HttpExceptionFilter** guarantees the frontend always receives the same
  JSON error shape (`{ success, statusCode, message, ... }`), whether the
  error came from validation, PDF parsing, or the Gemini API.

---

## Request flow

```
Browser (index.html)
   │  fetch('/ai/upload', { method: 'POST', body: FormData })
   ▼
AiController  (POST /ai/upload)
   │  PdfFileValidationPipe checks: present? non-empty? real PDF? under size limit?
   ▼
AiService.processPdf()
   │
   ├─ 1. parsePdfBuffer()        → raw text + page count
   ├─ 2. cleanExtractedText()    → normalized, AI-ready text
   ├─ 3. convertTextToMarkdown() → structured Markdown
   ├─ 4. extractMetadata()       → file name, pages, word count, size
   └─ 5. GeminiService.analyzeDocument(markdown)
          → sends Markdown to Gemini 2.5 Flash
          → asks for { summary, topics, keyPoints } as strict JSON
   ▼
UploadResponseDto returned as JSON
   ▼
Browser renders: metadata cards → Markdown block → summary card →
                  topic badges → key point list
```

---

## Error handling

| Situation                        | Response                                          |
|-----------------------------------|----------------------------------------------------|
| No file attached                  | `400` — "No file was uploaded..."                  |
| Empty file                        | `400` — "The uploaded file is empty."               |
| Wrong file type (not `.pdf`)      | `400` — "Unsupported file type..."                  |
| File too large                    | `400` — "File is too large..."                      |
| Corrupted / password-protected PDF| `400` — "Could not parse this PDF..."               |
| PDF has no extractable text       | `400` — "This PDF has no extractable text..."       |
| Gemini API key missing/invalid    | `500` — "The AI analysis step failed..."            |
| Gemini returns malformed JSON     | `500` — "The AI returned a response that could not be understood." |

Every error reaches the frontend as JSON via the global
`HttpExceptionFilter`, and the frontend displays it in the red error
banner without crashing the page.

---

## Notes on the "storage in memory only" requirement

- Multer's `FileInterceptor('file')` is configured with no `dest`/`storage`
  option, which makes it default to **in-memory storage** — the file
  arrives as a `Buffer` and is never written to disk.
- There is no database. Nothing persists between requests; each upload is
  processed and returned in a single request/response cycle.

---

## Dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express \
  @nestjs/config @nestjs/serve-static class-validator class-transformer \
  multer pdf-parse @google/genai reflect-metadata rxjs

npm install -D @nestjs/cli @nestjs/schematics @types/express \
  @types/multer @types/node @types/pdf-parse typescript prettier
```
(Already declared in `package.json` — just run `npm install`.)
