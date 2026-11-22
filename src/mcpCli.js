#!/usr/bin/env node

const {
  StdioServerTransport,
} = require('@modelcontextprotocol/sdk/server/stdio.js');

const { createMcpServer, parseArgs } = require('./mcp');

const main = async () => {
  const { server, client } = createMcpServer(
    parseArgs(process.argv.slice(2), process.env),
  );
  await client.login();
  await server.connect(new StdioServerTransport());
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
