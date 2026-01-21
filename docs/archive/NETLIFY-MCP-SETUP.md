# Netlify MCP Server Setup Guide

This guide will help you configure the Netlify MCP (Model Context Protocol) server in Cursor IDE.

## Prerequisites ✅

- ✅ Node.js v24.11.1 (required: >= 22)
- ✅ Netlify CLI installed globally (v23.12.3)

## Step 1: Configure MCP Server in Cursor

1. **Open Cursor Settings:**
   - Go to **Settings** > **Features** > **MCP** (or **Settings** > **MCP**)
   - Or use the keyboard shortcut: `Ctrl+,` (Windows) then search for "MCP"

2. **Add New MCP Server:**
   - Click on **+ Add New MCP Server** or **Add Server**
   - Fill in the following details:
     - **Name:** `Netlify MCP`
     - **Type:** `stdio`
     - **Command:** `npx`
     - **Arguments:** `-y @netlify/mcp`

## Step 2: Authenticate with Netlify (Optional but Recommended)

If you need to authenticate (for private sites or advanced features):

1. **Generate a Netlify Personal Access Token:**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Navigate to **User settings** > **Applications** > **Personal access tokens**
   - Click **New access token**
   - Provide a description (e.g., "Cursor MCP Server")
   - Click **Generate token**
   - **Copy the token** (you won't see it again!)

2. **Add Token to MCP Configuration:**

   **Option A: Using Cursor UI**
   - In Cursor's MCP settings, find your Netlify MCP server configuration
   - Add an environment variable:
     - **Key:** `NETLIFY_PERSONAL_ACCESS_TOKEN`
     - **Value:** `YOUR-TOKEN-HERE` (paste the token you copied)

   **Option B: Edit Config File Directly**
   
   If you're editing the MCP configuration file directly, copy and paste this JSON configuration:
   
   **Replace `YOUR-TOKEN-HERE` with your actual Netlify Personal Access Token:**
   
   ```json
   {
     "mcpServers": {
       "netlify": {
         "command": "npx",
         "args": ["-y", "@netlify/mcp"],
         "env": {
           "NETLIFY_PERSONAL_ACCESS_TOKEN": "YOUR-TOKEN-HERE"
         }
       }
     }
   }
   ```
   
   **Or if you already have other MCP servers configured, just add the `netlify` section:**
   
   ```json
   "netlify": {
     "command": "npx",
     "args": ["-y", "@netlify/mcp"],
     "env": {
       "NETLIFY_PERSONAL_ACCESS_TOKEN": "YOUR-TOKEN-HERE"
     }
   }
   ```

## Step 3: Restart Cursor

After configuring the MCP server:
1. Save your settings
2. **Restart Cursor** to apply the changes

## Step 4: Verify Installation

Once Cursor restarts, you can test the integration by asking me to:
- "Deploy this project to Netlify"
- "Show me my Netlify sites"
- "Check the deployment status"
- "List my Netlify functions"

## Troubleshooting

### MCP Server Not Working
- Ensure Node.js version is 22 or higher
- Check that `npx` is available in your PATH
- Verify the command and arguments are correct in Cursor settings
- Try restarting Cursor again

### Authentication Issues
- Make sure your Personal Access Token is valid
- Check that the token hasn't expired
- Verify the environment variable name is exactly `NETLIFY_PERSONAL_ACCESS_TOKEN`

### Command Not Found
- Ensure Netlify CLI is installed: `npm install -g netlify-cli`
- Verify `npx` is available: `npx --version`

## Additional Resources

- [Netlify MCP Server Documentation](https://docs.netlify.com/build/build-with-ai/netlify-mcp-server/)
- [Cursor MCP Directory](https://cursor.directory/mcp/netlify-1)
- [Netlify Personal Access Tokens](https://app.netlify.com/user/applications)

