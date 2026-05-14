# Kaleidoshare

> 日本語のREADMEはこちらです: [README.ja.md](README.ja.md)

Create and share interactive kaleidoscope designs on the web.


![Kaleidoshare Demo](ogp.png)


## Demo

[**View the live demo at kaleidoshare.deno.dev**](https://kaleidoshare.deno.dev/)

## Features

- **Live Editor**: Design custom kaleidoscopes with a real-time preview.
- **Rich Configuration**: Customize shapes, colors, physics, and animations using a JSON-based settings editor.
- **Sharing**: Save your creations and share them with a unique URL.
- **Passwordless Authentication**: Secure, WebAuthn-based user accounts for managing your designs.
- **Persistent Storage**: User data and kaleidoscope designs are stored using Deno KV.
- **Automated Testing**: End-to-end tests using Playwright, configured for Chromium.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Monaco Editor, Matter.js
- **Backend**: Deno, Oak (web framework)
- **Database**: Deno KV
- **Authentication**: WebAuthn (via `simplewebauthn`)
- **Testing**: Playwright (frontend), Node.js Test Runner (backend)
- **Deployment**: GitHub Actions to Deno Deploy

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= v20
- [Deno](https://deno.land/) >= v1.32

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/kaleidoshare.git
    cd kaleidoshare
    ```

2.  **Install dependencies:**
    ```bash
    npm ci
    ```

3.  **Install Playwright browsers:**
    ```bash
    npx playwright install --with-deps
    ```

### Running Locally

Start the development server, which includes the Vite frontend and the Deno backend with hot-reloading:

```bash
npm run dev
```

Open the URL provided by Vite in your browser (e.g., `http://localhost:5173`). The backend API will be running on port 8000 and proxied automatically.

## Available Scripts

- `npm run dev`: Starts the frontend and backend development servers.
- `npm run build`: Builds the production-ready frontend and generates the data schema.
- `npm run preview`: Serves the built frontend with the production Deno server.
- `npm test`: Runs all backend and frontend (Playwright) tests.

## API & Data Model

The backend is a Deno server using the Oak framework. Data is stored in Deno KV with the following key structure:

- `["contents", author, contentId]`: Stores kaleidoscope `Content` metadata.
- `["images", author, contentId, index]`: Stores base64-encoded kaleidoscope images, chunked for Deno KV's value size limit.
- `["users", userName]`: Stores `User` information.
- `["credentials", credentialID]`: Stores WebAuthn `Credential` data.

Key API endpoints are located under `/api/`:

- **Authentication**: `POST /credential/new`, `POST /session/new`, `GET /session`, `DELETE /session`
- **Content Management**:
  - `GET /contents/:author`: List all creations for a user.
  - `POST /contents/:author`: Create a new kaleidoscope.
  - `GET /contents/:author/:contentId`: Retrieve a specific kaleidoscope.
  - `PUT /contents/:author/:contentId`: Update an existing kaleidoscope.
  - `DELETE /contents/:author/:contentId`: Delete a kaleidoscope.

## License

MIT License — see [LICENSE](LICENSE).