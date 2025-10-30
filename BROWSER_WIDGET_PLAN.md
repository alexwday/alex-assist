# Browser Widget Implementation Plan

## Overview
A fully functional browser widget that users can drag into their grid, which also serves as a tool for the AI assistant to search the web and scrape pages.

## Key Features

### User-Facing Features
1. **Draggable Browser Widget**
   - Appears in widgets sidebar
   - Can be dragged into grid like any other widget
   - Resizable and movable within grid

2. **Browser Controls**
   - Address bar with URL input
   - Back/Forward navigation buttons
   - Home button (navigates to google.ca)
   - Refresh button
   - "Send to AI" button (scrapes current page and adds to chat context)

3. **Full Browsing Capability**
   - User can manually enter URLs
   - User can click links and navigate
   - User can use the browser normally

### AI Assistant Features
1. **Dynamic Tool Registration**
   - When browser widget is added to grid, it registers as an available tool for the AI
   - When removed from grid, tool is unregistered

2. **AI Browser Tools**
   - `search(query)`: Performs DuckDuckGo search, displays results in browser
   - `navigate(url)`: Opens a specific URL in the browser
   - `scrape_and_read()`: Scrapes current page content using crawl4ai and adds to chat context
   - `follow_link(link_index)`: From search results, follows a specific link and auto-scrapes

3. **Automated Workflow**
   - AI can search → see results → follow promising links → read content → answer questions
   - All actions visible to user in the browser widget
   - User maintains full control and can intervene at any time

---

## Technical Architecture

### Frontend Components

#### 1. BrowserWidget Component
**Location:** `frontend/src/components/Widgets/BrowserWidget/BrowserWidget.tsx`

**Structure:**
```
BrowserWidget/
├── BrowserWidget.tsx       # Main component
├── BrowserControls.tsx     # Address bar, buttons
├── BrowserFrame.tsx        # Iframe/proxy container
└── useBrowserState.ts      # State management hook
```

**Key State:**
- Current URL
- Navigation history (back/forward stacks)
- Loading state
- Page title
- Whether page is scrapeable

**Challenges & Solutions:**
- **CORS Issues:** Most websites won't load in an iframe due to X-Frame-Options
  - Solution: Use a backend proxy that fetches pages and serves them
  - Proxy should preserve functionality while allowing iframe embedding

- **JavaScript Execution:** Pages need JS to function
  - Solution: Proxy should inject minimal wrapper code
  - May need to handle relative URLs and rewrite them

- **Security:** Need to sandbox the browser
  - Solution: Use iframe with sandbox attribute
  - Limit certain capabilities as needed

#### 2. Widget Sidebar Integration
**File:** `frontend/src/components/Widgets/WidgetsSidebar.tsx`

- Add browser widget to available widgets list
- Provide drag-and-drop functionality
- Show preview/icon for browser widget

#### 3. Widget State Management
**File:** `frontend/src/contexts/WidgetStateContext.tsx`

- Track active widgets and their states
- Maintain browser widget state (URL, history, etc.)
- Persist state in sessions

### Backend Services

#### 1. Browser Proxy Service
**Location:** `app/services/browser_proxy.py`

**Purpose:** Proxy web requests to avoid CORS issues

**Endpoints:**
- `GET /api/proxy?url={url}`: Fetches and returns page content
- Rewrites URLs to route through proxy
- Handles redirects
- Preserves cookies/session if needed

**Implementation Notes:**
- Use `httpx` or `requests` for fetching
- Parse HTML and rewrite URLs using BeautifulSoup
- Add appropriate headers
- Handle HTTPS properly

#### 2. Web Scraping Service (crawl4ai)
**Location:** `app/services/web_scraper.py`

**Purpose:** Extract meaningful content from web pages for LLM consumption

**Dependencies:**
```bash
pip install crawl4ai
```

**Key Functions:**
- `scrape_url(url: str) -> ScrapedContent`
- `extract_main_content(html: str) -> str`
- `extract_metadata(url: str) -> dict`

**crawl4ai Features to Use:**
- Smart content extraction (removes ads, navbars, footers)
- Markdown conversion for clean LLM input
- Link extraction
- Image alt-text extraction
- Metadata extraction

**Endpoints:**
- `POST /api/scrape`: Scrapes a URL and returns structured content
  ```json
  {
    "url": "https://example.com",
    "options": {
      "include_links": true,
      "markdown": true
    }
  }
  ```

**Response Format:**
```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "content": "Main content as markdown...",
  "links": [
    {"text": "Link text", "url": "https://..."}
  ],
  "metadata": {
    "description": "...",
    "author": "...",
    "published_date": "..."
  }
}
```

#### 3. Search Service (DuckDuckGo)
**Location:** `app/services/search_service.py`

**Purpose:** Perform web searches for the AI assistant

**Dependencies:**
```bash
pip install duckduckgo-search
```

**Key Functions:**
- `search(query: str, max_results: int = 10) -> List[SearchResult]`

**Endpoints:**
- `POST /api/search`
  ```json
  {
    "query": "python web scraping",
    "max_results": 10
  }
  ```

**Response Format:**
```json
{
  "query": "python web scraping",
  "results": [
    {
      "title": "...",
      "url": "https://...",
      "snippet": "..."
    }
  ]
}
```

#### 4. AI Tools Registry
**Location:** `app/services/ai_tools_registry.py`

**Purpose:** Dynamic tool registration for AI assistant

**Concept:**
- When browser widget is added to grid, frontend notifies backend
- Backend registers browser tools in AI's tool list
- AI can now invoke browser tools
- When browser widget is removed, tools are unregistered

**Tool Definitions for AI:**

```python
BROWSER_TOOLS = [
    {
        "name": "search_web",
        "description": "Search the web using DuckDuckGo. Returns a list of search results that can be followed.",
        "parameters": {
            "query": "The search query string"
        }
    },
    {
        "name": "navigate_browser",
        "description": "Navigate the browser to a specific URL. The page will be displayed in the user's browser widget.",
        "parameters": {
            "url": "The URL to navigate to"
        }
    },
    {
        "name": "scrape_current_page",
        "description": "Scrape and read the content of the page currently displayed in the browser. Returns the main content as markdown.",
        "parameters": {}
    },
    {
        "name": "follow_search_result",
        "description": "From the most recent search, follow a specific result by index, automatically scraping its content.",
        "parameters": {
            "index": "The 0-based index of the search result to follow"
        }
    }
]
```

**State Management:**
- Track which browser widgets exist for each session
- Track current search results for each browser
- Track current URL for each browser widget

**Endpoints:**
- `POST /api/tools/register`: Register browser widget
- `POST /api/tools/unregister`: Unregister browser widget
- `POST /api/tools/invoke`: Invoke a tool (called by AI)

### Communication Flow

#### User → AI Flow (Manual Scraping)
1. User is browsing a page in browser widget
2. User clicks "Send to AI" button
3. Frontend calls `POST /api/scrape` with current URL
4. Backend uses crawl4ai to scrape content
5. Backend returns structured content
6. Frontend adds content to chat as a user message: "Here's the content from [URL]:"
7. AI can now answer questions about the page

#### AI → Browser Flow (AI-Initiated Search)
1. User asks AI: "What are the best Python web scraping libraries?"
2. AI decides to use `search_web` tool
3. AI service calls tool handler with query
4. Backend performs DuckDuckGo search
5. Backend returns results to AI
6. Backend also sends WebSocket message to frontend with results
7. Frontend displays results in browser widget (formatted search results page)
8. AI responds: "I found several options. Let me check the top result..."
9. AI uses `follow_search_result` tool with index 0
10. Backend navigates browser to that URL
11. Backend scrapes page content with crawl4ai
12. Backend returns content to AI
13. Frontend shows the page in browser widget
14. AI reads content and formulates answer

---

## Implementation Phases

### Phase 1: Backend Foundation (Estimated: 2-3 days)
**Goal:** Set up backend services for proxying, scraping, and search

**Tasks:**
1. ✅ Install dependencies: `crawl4ai`, `duckduckgo-search`, `beautifulsoup4`, `httpx`
2. ✅ Create browser proxy service
   - Implement URL fetching
   - Implement URL rewriting for iframe compatibility
   - Test with various websites
3. ✅ Create web scraping service with crawl4ai
   - Implement URL scraping
   - Test content extraction quality
   - Handle error cases (timeout, 404, etc.)
4. ✅ Create search service with DuckDuckGo
   - Implement search functionality
   - Format results appropriately
5. ✅ Create API endpoints
   - `/api/proxy`
   - `/api/scrape`
   - `/api/search`
6. ✅ Test all endpoints independently

### Phase 2: Browser Widget UI (Estimated: 2-3 days)
**Goal:** Create functional browser widget that users can interact with

**Tasks:**
1. ✅ Create BrowserWidget component structure
2. ✅ Implement browser controls UI
   - Address bar with URL input
   - Back/Forward buttons
   - Home button
   - Refresh button
   - Loading indicator
3. ✅ Implement iframe container
   - Configure sandbox properly
   - Handle loading states
   - Connect to proxy endpoint
4. ✅ Implement "Send to AI" button
   - Call scrape endpoint
   - Format scraped content
   - Add to chat interface
5. ✅ Implement navigation history
   - Track visited URLs
   - Enable back/forward functionality
6. ✅ Add browser widget to widgets sidebar
7. ✅ Test drag-and-drop into grid
8. ✅ Test manual browsing functionality

### Phase 3: Widget State Management (Estimated: 1-2 days)
**Goal:** Persist browser state in sessions

**Tasks:**
1. ✅ Update widget type definitions to include browser
2. ✅ Add browser state to WidgetStateContext
   - Current URL
   - Navigation history
   - Page title
3. ✅ Implement state persistence
   - Save to localStorage
   - Restore on session load
4. ✅ Handle multiple browser widgets
   - Each has independent state
   - IDs to track them separately

### Phase 4: AI Tool Integration (Estimated: 3-4 days)
**Goal:** Enable AI assistant to use browser as a tool

**Tasks:**
1. ✅ Create AI tools registry service
   - Dynamic tool registration
   - Tool invocation handling
2. ✅ Implement tool registration endpoints
   - Register browser when added to grid
   - Unregister when removed
3. ✅ Implement tool handlers
   - `search_web`: Call search service, return results, update browser UI
   - `navigate_browser`: Update browser URL via WebSocket
   - `scrape_current_page`: Call scrape service, return content
   - `follow_search_result`: Navigate + scrape in one action
4. ✅ Add WebSocket communication
   - Backend can push commands to specific browser widgets
   - Frontend listens and updates browser state
5. ✅ Update AI chat service to include browser tools
   - Add tools to AI's available tools when registered
   - Handle tool results appropriately
6. ✅ Test AI workflows
   - Search → Read results → Follow link → Scrape → Answer

### Phase 5: Polish & Testing (Estimated: 2-3 days)
**Goal:** Ensure smooth user experience and handle edge cases

**Tasks:**
1. ✅ Error handling
   - Network errors
   - Unreachable URLs
   - Scraping failures
   - Timeout handling
2. ✅ Loading states
   - Show loading indicators during scraping
   - Show loading during navigation
   - Disable buttons appropriately
3. ✅ UI/UX improvements
   - Visual feedback for AI actions
   - Highlight when AI is controlling browser
   - Better search results formatting
4. ✅ Security review
   - Ensure iframe is properly sandboxed
   - Validate URLs before proxying
   - Rate limiting on proxy endpoint
5. ✅ Performance optimization
   - Cache scraped content temporarily
   - Optimize proxy for common sites
6. ✅ Documentation
   - User guide for browser widget
   - Developer documentation for tool system

---

## Technical Challenges & Solutions

### Challenge 1: CORS and iframe Restrictions
**Problem:** Most websites set X-Frame-Options header preventing iframe embedding

**Solutions:**
- **Option A (Recommended):** Backend proxy that strips security headers
  - Fetch page on backend
  - Remove X-Frame-Options and CSP headers
  - Serve through our domain
  - Rewrite URLs to route through proxy

- **Option B:** Use Puppeteer/Playwright for screenshots
  - Take screenshots of pages
  - Display as images with click-to-update
  - Less functional but works for read-only viewing

- **Option C:** Electron WebView (if moving to Electron)
  - Full browser engine
  - No CORS restrictions
  - Most flexible but requires Electron

**Recommendation:** Start with Option A (proxy). If specific sites don't work well, add Option B as fallback.

### Challenge 2: JavaScript-Heavy Sites
**Problem:** Modern sites rely heavily on JS, which may not work properly through proxy

**Solutions:**
- Use headless browser (Playwright) in proxy for JS-heavy sites
- Detect if page needs JS execution
- Fall back to full rendering when needed
- cache rendered results

### Challenge 3: AI Tool State Management
**Problem:** AI needs to know which browser widget to control when multiple exist

**Solutions:**
- Include widget_id in tool parameters
- Maintain mapping of session_id → active_browser_widget_id
- Default to most recently created browser if ambiguous
- AI can ask user which browser to use

### Challenge 4: Real-time UI Updates
**Problem:** When AI controls browser, user needs to see it happening

**Solutions:**
- Use WebSocket for real-time updates
- Frontend subscribes to browser widget events
- Backend pushes navigation events, scraping status, etc.
- Show visual indicators when AI is controlling browser

### Challenge 5: Content Quality from crawl4ai
**Problem:** Some pages may not scrape well, giving AI poor context

**Solutions:**
- Implement fallback scraping strategies
- Allow AI to try alternative pages if content is insufficient
- Add content quality scoring
- Let user manually intervene if AI struggles

---

## File Structure

```
alex-assist/
├── app/
│   ├── services/
│   │   ├── browser_proxy.py          # Proxy service for CORS
│   │   ├── web_scraper.py            # crawl4ai integration
│   │   ├── search_service.py         # DuckDuckGo search
│   │   └── ai_tools_registry.py      # Dynamic tool registration
│   └── api/
│       └── browser_routes.py          # API endpoints
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Widgets/
        │   │   ├── BrowserWidget/
        │   │   │   ├── BrowserWidget.tsx
        │   │   │   ├── BrowserControls.tsx
        │   │   │   ├── BrowserFrame.tsx
        │   │   │   └── useBrowserState.ts
        │   │   └── WidgetsSidebar.tsx  # Add browser to list
        │   └── ChatWidget/
        │       └── ChatWidget.tsx       # Update for scraped content
        ├── contexts/
        │   └── WidgetStateContext.tsx   # Add browser state
        ├── types/
        │   └── widget.ts                # Add browser widget type
        └── hooks/
            └── useBrowserWebSocket.ts   # WebSocket for browser updates
```

---

## API Specifications

### 1. Proxy Endpoint
```
GET /api/proxy?url={encoded_url}

Response:
- HTML content with rewritten URLs
- Appropriate headers for iframe display
```

### 2. Scrape Endpoint
```
POST /api/scrape
Body: {
  "url": "https://example.com",
  "options": {
    "include_links": true,
    "format": "markdown"
  }
}

Response: {
  "url": "https://example.com",
  "title": "Page Title",
  "content": "Markdown content...",
  "links": [...],
  "metadata": {...},
  "scraped_at": "2025-10-30T12:00:00Z"
}
```

### 3. Search Endpoint
```
POST /api/search
Body: {
  "query": "python web scraping",
  "max_results": 10
}

Response: {
  "query": "python web scraping",
  "results": [
    {
      "index": 0,
      "title": "...",
      "url": "https://...",
      "snippet": "..."
    }
  ]
}
```

### 4. Tool Registration
```
POST /api/tools/register
Body: {
  "session_id": "session-123",
  "widget_id": "browser-456",
  "tools": ["search_web", "navigate_browser", ...]
}

Response: {
  "success": true,
  "registered_tools": [...]
}
```

### 5. Tool Invocation (Internal)
```
POST /api/tools/invoke
Body: {
  "session_id": "session-123",
  "widget_id": "browser-456",
  "tool": "search_web",
  "parameters": {
    "query": "..."
  }
}

Response: {
  "success": true,
  "result": {...},
  "display_message": "Searched for '...' and found 10 results"
}
```

---

## Security Considerations

1. **Proxy Security**
   - Validate URLs before proxying
   - Block internal IPs (SSRF protection)
   - Rate limiting per user/session
   - Timeout protection

2. **Iframe Sandboxing**
   - Use restrictive sandbox attributes
   - Disable forms if needed
   - Limit scripts if possible

3. **Scraping Limits**
   - Rate limit scraping requests
   - Cache results to avoid repeat scraping
   - Respect robots.txt (optional but good practice)

4. **WebSocket Security**
   - Authenticate WebSocket connections
   - Validate widget_id ownership
   - Encrypt sensitive data

---

## Future Enhancements

1. **Multiple Search Engines**
   - Add Google, Bing as alternatives
   - Let AI choose best engine for query

2. **Smart Link Following**
   - AI analyzes multiple results in parallel
   - Scores pages by relevance before deep-reading

3. **Persistent Browser Sessions**
   - Maintain cookies across requests
   - Handle authentication flows
   - Remember login states

4. **Screenshot Capability**
   - Take screenshots of pages
   - OCR for image-heavy content
   - Visual debugging for AI

5. **Advanced Scraping**
   - Handle dynamic content (JS rendering)
   - Extract tables, charts, data
   - PDF content extraction

6. **Browser History**
   - Show browsing history in widget
   - Let AI reference previously visited pages
   - Export browsing sessions

---

## Testing Strategy

### Unit Tests
- Test scraping service with various URLs
- Test search service with different queries
- Test URL rewriting in proxy
- Test tool registration/unregistration

### Integration Tests
- Test full AI workflow: search → follow → scrape → answer
- Test manual user workflow: browse → scrape → ask AI
- Test multiple browser widgets simultaneously
- Test widget state persistence

### End-to-End Tests
- User adds browser widget to grid
- User searches manually
- User clicks "Send to AI"
- AI searches and follows links
- User removes widget

### Performance Tests
- Scraping speed for various sites
- Proxy response time
- WebSocket message latency
- Multiple concurrent requests

---

## Estimated Timeline

- **Phase 1:** Backend Foundation - 2-3 days
- **Phase 2:** Browser Widget UI - 2-3 days
- **Phase 3:** Widget State Management - 1-2 days
- **Phase 4:** AI Tool Integration - 3-4 days
- **Phase 5:** Polish & Testing - 2-3 days

**Total Estimated Time:** 10-15 days of focused development

This can be broken into smaller iterations:
- **MVP (Phase 1-3):** Basic browser widget that users can interact with - ~5-7 days
- **AI Integration (Phase 4):** Add AI tool capabilities - ~3-4 days
- **Polish (Phase 5):** Refinement and edge cases - ~2-3 days

---

## Success Criteria

✅ User can drag browser widget into grid
✅ User can manually browse websites in widget
✅ User can click "Send to AI" to scrape current page
✅ AI can search the web when needed in conversation
✅ AI can navigate browser to specific URLs
✅ AI can scrape and read web content
✅ AI can follow links from search results
✅ All actions are visible to user in real-time
✅ Multiple browser widgets can coexist
✅ Browser state persists across sessions
✅ System handles errors gracefully

---

## Next Steps

1. Review this plan with team/stakeholders
2. Decide on MVP scope (recommend Phase 1-3 first)
3. Set up development environment with dependencies
4. Begin Phase 1: Backend Foundation
5. Create feature branch: `feature/browser-widget`
6. Track progress using project management tool

---

**Document Version:** 1.0
**Last Updated:** 2025-10-30
**Author:** Planning Phase
