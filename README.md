# WikiGraph 🧠

> **Turn Wikipedia into an interactive knowledge graph.**

WikiGraph is an AI-powered Wikipedia knowledge graph explorer that transforms a Wikipedia article into an interactive visual map of related people, events, concepts, organizations, places, discoveries, and historical periods.

Instead of reading a long Wikipedia article from beginning to end, WikiGraph helps you **see how the knowledge connects** and explore those connections interactively.

---

## ✨ Features

### 🕸️ Interactive Knowledge Graph

Enter a Wikipedia article or search for a topic and WikiGraph generates an interactive graph containing:

* People
* Events
* Concepts
* Organizations
* Locations
* Discoveries
* Historical periods
* Other relevant entities

Each node contains information such as its summary, importance, historical period, Wikipedia source, and relationships with other nodes.

---

### 🤖 AI-Powered Graph Generation

WikiGraph uses **Google Gemini** to analyze Wikipedia content and identify important entities and relationships.

The AI generates structured graph data including:

* Nodes
* Relationships
* Entity categories
* Summaries
* Importance scores
* Historical periods
* Source references

The generated result is then rendered as an interactive graph using **D3.js**.

---

### 🔎 Wikipedia Integration

WikiGraph retrieves information directly from Wikipedia using its APIs.

It supports:

* Wikipedia search
* Wikipedia URLs
* Multiple Wikipedia language editions
* Automatic article resolution
* Article summaries and extracts
* Direct links back to the original Wikipedia article

If an exact article cannot be found, WikiGraph attempts to resolve the topic through Wikipedia search.

---

### 📚 Source References

Generated nodes can include source excerpts from Wikipedia so users can verify the information behind the graph.

Every node can also link directly to its corresponding Wikipedia article.

> AI-generated information should always be verified against the original source.

---

### 🌳 Expand the Graph

Found an interesting node?

Expand it to discover additional related entities and continue exploring the topic without manually searching for every article.

This allows WikiGraph to work more like an **interactive knowledge exploration tool** rather than a traditional search engine.

---

### 💬 AI Deep Dive

Users can ask questions about individual nodes through the AI Deep Dive feature.

This allows you to go from:

**Graph → Node → Question → Explanation**

Deep-dive conversations can also be stored alongside the graph history.

---

### 📺 Video Discovery

WikiGraph can generate relevant YouTube search queries for individual nodes.

Instead of manually thinking about what to search, the AI suggests useful topics and lets users continue their exploration through YouTube.

---

### 🕰️ Timeline

Historical nodes can be displayed through a timeline view, making it easier to understand how events, people, and discoveries relate to different periods.

---

### 💾 Graph History & Caching

Generated graphs are stored locally using **LowDB**.

WikiGraph can:

* Save generated graphs
* Restore previous graphs
* Delete graphs from history
* Store Deep Dive conversations
* Cache previously generated graphs

Caching also helps reduce unnecessary Gemini API calls when the same topic and focus are requested again.

---

### 📤 Export

Generated knowledge graphs can be exported from the application for later use.

---

## 🛠️ Tech Stack

### Frontend

* **React 19**
* **TypeScript**
* **Vite**
* **D3.js**
* **Tailwind CSS**
* **Lucide React**
* **Motion**

### Backend

* **Node.js**
* **Express**
* **TypeScript**
* **tsx**

### AI

* **Google Gemini API**
* `@google/genai`

### Data

* **Wikipedia REST API**
* **Wikipedia Action API**
* **LowDB**

### Utilities

* `jsonrepair` for recovering malformed/truncated AI JSON responses
* `esbuild` for production server bundling

---

## 🏗️ Architecture

At a high level, WikiGraph follows this flow:

```text
                 User
                   │
                   ▼
          ┌─────────────────┐
          │   React + Vite  │
          │    Frontend     │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Express Backend │
          └───────┬─────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌───────────────┐     ┌───────────────┐
│   Wikipedia   │     │  Gemini API   │
│ REST / Action │     │               │
│     APIs      │     │ Graph analysis│
└───────┬───────┘     └───────┬───────┘
        │                     │
        └──────────┬──────────┘
                   ▼
          ┌─────────────────┐
          │ Knowledge Graph │
          │ Nodes + Links   │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │     LowDB       │
          │ Cache + History │
          └─────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

* [Node.js](https://nodejs.org/) 18+
* A Google Gemini API key

---

### 1. Clone the repository

```bash
git clone https://github.com/kenzo123/wikigraph.git
cd wikigraph
```

Replace `YOUR_USERNAME/wikigraph` with your actual repository URL.

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

You can use `.env.example` as a reference.

**Never commit your real API key to GitHub.**

The project already ignores `.env*` files through `.gitignore`, while keeping `.env.example` available.

---

### 4. Start the development server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

---

## 📦 Production Build

Build both the frontend and backend:

```bash
npm run build
```

Then start the production server:

```bash
npm start
```

---

## 🧪 Type Checking

Run TypeScript checking with:

```bash
npm run lint
```

---

## 📁 Project Structure

```text
.
├── src/
│   ├── components/
│   │   ├── ExportModal.tsx
│   │   ├── Header.tsx
│   │   ├── HelpGuideModal.tsx
│   │   ├── HistorySidebar.tsx
│   │   ├── KnowledgeGraphView.tsx
│   │   ├── LoadingOverlay.tsx
│   │   ├── NodeDetailPanel.tsx
│   │   ├── SavedGraphsModal.tsx
│   │   ├── TimelineView.tsx
│   │   └── WikiSearchInput.tsx
│   │
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   └── data/
│
├── server/
│   └── database.ts
│
├── server.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🔌 Main API Endpoints

| Endpoint                   | Method   | Purpose                             |
| -------------------------- | -------- | ----------------------------------- |
| `/api/wiki/search`         | `GET`    | Search Wikipedia                    |
| `/api/wiki/generate-graph` | `POST`   | Generate a knowledge graph          |
| `/api/wiki/expand-node`    | `POST`   | Expand a graph node                 |
| `/api/wiki/deep-dive`      | `POST`   | Ask AI about a node                 |
| `/api/node-videos`         | `POST`   | Generate YouTube search suggestions |
| `/api/history`             | `GET`    | Get saved graph history             |
| `/api/history/:id`         | `GET`    | Retrieve a saved graph              |
| `/api/history/:id`         | `DELETE` | Delete a saved graph                |

---

## 🧠 How Graph Generation Works

When a user searches for a topic:

1. WikiGraph identifies the requested Wikipedia language and article.
2. The backend retrieves Wikipedia content.
3. Wikipedia search is used as a fallback when necessary.
4. The extracted content is sent to Gemini.
5. Gemini identifies entities and relationships.
6. The response is converted into structured graph data.
7. The graph is validated and parsed.
8. The result is rendered using D3.js.
9. The generated graph is cached in LowDB.
10. Users can continue exploring, expanding nodes, asking questions, or viewing the timeline.

---

## ⚡ Caching

Generating a graph requires an AI request, which can introduce both latency and API usage.

WikiGraph therefore caches generated graphs using a key based on the requested:

```text
language + article + focus
```

For example:

```text
vi:đại việt:all
```

If the same graph already exists in the database, WikiGraph can reuse the cached result instead of generating it again.

---

## 🌍 Language Support

WikiGraph can work with different Wikipedia language editions.

The language is inferred from Wikipedia URLs when possible.

For example:

```text
https://en.wikipedia.org/wiki/Albert_Einstein
```

will target the English Wikipedia edition, while:

```text
https://vi.wikipedia.org/wiki/Albert_Einstein
```

will target the Vietnamese edition.

---

## ⚠️ Limitations

WikiGraph is currently a personal/experimental project and has several limitations.

### AI Accuracy

Gemini-generated relationships and summaries may contain mistakes.

Always verify important information using the original Wikipedia sources.

### Citation Verification

Source excerpts are generated as part of the graph-generation process and should not be treated as a substitute for checking the original Wikipedia article.

### Local Database

The current implementation uses **LowDB**, which stores data in a local JSON file.

This is convenient for development and small-scale deployments but is not designed for large-scale concurrent usage.

### AI API Dependency

Graph generation, node expansion, and Deep Dive features depend on access to the Gemini API.

API availability, latency, quotas, and costs may affect the application.

### YouTube Results

WikiGraph currently generates YouTube search queries rather than directly retrieving and verifying individual YouTube videos.

---

## 🗺️ Roadmap

Potential future improvements include:

* [ ] Stronger source/citation verification
* [ ] More robust AI output validation
* [ ] Improved graph layouts
* [ ] Better mobile experience
* [ ] More Wikipedia language support
* [ ] More advanced graph filtering
* [ ] Improved search and discovery
* [ ] SQLite/PostgreSQL support for larger deployments
* [ ] More export formats
* [ ] User accounts and cloud-saved graphs

---

## 🎯 Why WikiGraph?

Wikipedia contains an enormous amount of information, but traditional article-based browsing can make it difficult to understand how different concepts connect.

WikiGraph explores a different approach:

> **What if learning started with the connections between ideas instead of a list of search results?**

The goal of WikiGraph is to make exploring knowledge feel more visual, interactive, and curiosity-driven.

---

## 📜 License

This project does not currently specify a license.

If you plan to allow others to use, modify, or redistribute the code, consider adding an appropriate open-source license.

---

## 👤 Author
**Kenzo**

Built as an independent learning and portfolio project.

---

<p align="center">
  <strong>Explore knowledge. Follow the connections. 🧠</strong>
</p>
