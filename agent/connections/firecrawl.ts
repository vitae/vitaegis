import { defineDynamic, defineMcpClientConnection } from 'eve/connections';
import { never } from 'eve/tools/approval';

/**
 * Firecrawl's hosted MCP server for scraping, crawling and searching the web: competitor
 * pages, trend sources, papers behind a URL. Offered only when FIRECRAWL_API_KEY is set.
 * Every tool is a read of the public web, so none is gated.
 */
export default defineDynamic({
  events: {
    'session.started': () => {
      const key = process.env.FIRECRAWL_API_KEY;
      if (!key) return null;
      return defineMcpClientConnection({
        url: `https://mcp.firecrawl.dev/${encodeURIComponent(key)}/v2/mcp`,
        description:
          'Firecrawl: scrape a page to markdown, map or crawl a site, search the web, extract structured data. Use it for competitor research, trend scans and reading sources the research desk has not ingested yet.',
        approval: never(),
      });
    },
  },
});
