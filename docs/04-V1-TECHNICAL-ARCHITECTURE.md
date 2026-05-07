# Premise Studio - Technical Architecture

## Frontend

- Next.js 15+
- TypeScript
- Tailwind
- Zustand
- Framer Motion

## State Architecture

- SessionStore
- CardTreeStore
- UIStore
- StreamingStore

## Backend

Node.js API Routes

## Persistence

### V1
- localStorage
- SQLite

### V2
- PostgreSQL
- Redis

## API Strategy

/api/workflow/premise
/api/workflow/angle
/api/workflow/draft
/api/workflow/rewrite

## Streaming Strategy

必须：
- incremental append
- optimistic rendering
- abort controller
- reconnect support

禁止：
- 整页 rerender
- replace whole content
