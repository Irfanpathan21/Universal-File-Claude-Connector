# MCP Client Configuration Guide

The Universal File Toolkit includes a fully compliant Model Context Protocol (MCP) server exposing 40+ file manipulation tools over STDIO.

## Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "universal-file-toolkit": {
      "command": "node",
      "args": [
        "/path/to/universal-file-toolkit/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

## Cursor

Go to **Settings > Cursor Settings > Features > MCP**, and click **+ Add New MCP Server**:

- **Name**: `universal-file-toolkit`
- **Type**: `command`
- **Command**: `node /path/to/universal-file-toolkit/packages/mcp-server/dist/index.js`

## VS Code

In `settings.json`:

```json
{
  "mcp.servers": {
    "universal-file-toolkit": {
      "command": "node",
      "args": [
        "/path/to/universal-file-toolkit/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

## Exposed MCP Tools Example

- `merge_pdf`: Combine multiple PDFs
- `split_pdf`: Split PDF by page ranges
- `resize_image`: Resize image to dimensions
- `convert_image`: Convert image format (PNG, JPG, WebP, AVIF)
- `json_to_csv`: Convert JSON array to CSV file
- `csv_to_json`: Convert CSV file to JSON
