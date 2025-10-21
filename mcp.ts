import fs from "fs";
import path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { UZDir } from "./core.js";
import { handleUzdirOptions } from "./cli.js";
import { t } from "./i18n";
import type { UZDirParams } from "./types.js";

/**
 * UZDir MCP (Model Context Protocol) Server
 *
 * This MCP server allows AI models to interact with UZDir's core functionality:
 * 1. extract_directory - Recursively decompress all specified compressed files in a directory
 * 2. create_password_map - Create a password mapping file for different compressed files
 *
 * The server implements the Model Context Protocol specification and can be used with
 * any AI model that supports MCP.
 */

export async function runMCPServer() {
  // 动态导入 package.json 获取版本号
  const pkg = await import(
    path.join(import.meta.dirname, "package.json"),
    {
      assert: { type: "json" },
    }
  );

  const server = new Server(
    {
      name: "uzdir-mcp",
      version: pkg.default.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Define available tools
  const tools = [
    {
      name: "extract_directory",
      description:
        "Recursively decompress all specified compressed files in a directory",
      inputSchema: {
        type: "object",
        properties: {
          input: {
            type: "string",
            description: "Input directory path or compressed file path",
          },
          output: {
            type: "string",
            description: "Output directory path",
          },
          password: {
            type: "string",
            description: "Decompression password",
          },
          filter: {
            type: "string",
            description:
              "File paths to filter (relative paths within the archive)",
          },
          maxConcurrency: {
            type: "number",
            description: "Maximum concurrency, defaults to CPU core count",
          },
          zipFormat: {
            type: "string",
            description:
              "Compressed file formats, multiple formats separated by commas, defaults to '.zip,.rar,.7z'",
          },
          passwordMap: {
            type: "string",
            description: "Password mapping JSON file path",
          },
          ignore: {
            type: "string",
            description:
              "Patterns for ignoring files/directories, multiple patterns separated by commas",
          },
          fullpath: {
            type: "boolean",
            description:
              "Whether to use full path decompression (create subdirectories with the same name), defaults to true",
          },
          log: {
            type: "boolean",
            description:
              "Whether to output logs to the output directory, defaults to false",
          },
        },
        required: ["input", "output"],
      },
    },
    {
      name: "create_password_map",
      description: "Create a password mapping file",
      inputSchema: {
        type: "object",
        properties: {
          passwordMap: {
            type: "object",
            description:
              'Password mapping object in the format { "filePath or fileName or fileExtension": "password" }',
            additionalProperties: { type: "string" },
          },
          outputPath: {
            type: "string",
            description: "Password mapping file output path",
          },
        },
        required: ["passwordMap", "outputPath"],
      },
    },
  ];

  // Handle tool listing requests
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: argsObj } = request.params;

    try {
      if (!argsObj) {
        return {
          content: [{
            type: "text",
            text: t("mcp.missingArguments"),
          }],
          isError: true,
        };
      }

      switch (name) {
        /**
         * Extract directory tool
         *
         * Recursively decompresses all specified compressed files in a directory.
         *
         * Parameters:
         * - input (string, required): Input directory path or compressed file path
         * - output (string, required): Output directory path
         * - password (string, optional): Decompression password
         * - filter (string, optional): File paths to filter (relative paths within the archive)
         * - maxConcurrency (number, optional): Maximum concurrency, defaults to CPU core count
         * - zipFormat (string, optional): Compressed file formats, multiple formats separated by commas, defaults to ".zip,.rar,.7z"
         * - passwordMapPath (string, optional): Password mapping JSON file path
         * - ignore (string, optional): Patterns for ignoring files/directories, multiple patterns separated by commas
         * - fullpath (boolean, optional): Whether to use full path decompression (create subdirectories with the same name), defaults to true
         * - log (boolean, optional): Whether to output logs to the output directory, defaults to false
         */
        case "extract_directory":
          try {
            // Convert arguments to UZDirParams format
            const uzdirParams: UZDirParams = {
              input: argsObj.input as string,
              output: argsObj.output as string,
              password: argsObj.password as string,
              filter: argsObj.filter as string,
              maxConcurrency: argsObj.maxConcurrency as number,
              zipFormat: argsObj.zipFormat as string,
              passwordMap: argsObj.passwordMap as string,
              ignore: argsObj.ignore as string,
              fullpath: argsObj.fullpath as string,
              log: argsObj.log as boolean,
            };

            // Create extractor instance
            const extractor = new UZDir(
              handleUzdirOptions(uzdirParams),
            );

            // Perform extraction
            await extractor.extractAll();

            // Get statistics
            const processedCount = extractor.getProcessedCount() || 0;
            const errorCount = extractor.getErrorCount() || 0;
            const errorPaths = extractor.getErrorPaths() || [];

            // Get duration
            const duration = extractor.getDuration();

            const L = extractor.getLogger();

            return {
              content: [{
                type: "text",
                text: `${t("messages.completed")}:
- ${t("messages.success")}: ${processedCount} ${t("messages.files")}
- ${t("messages.failed")}: ${errorCount} ${t("messages.files")}
${
                  errorCount > 0
                    ? `- ${t("messages.failedList")}:\n${
                      errorPaths.map((e: string) => `  - ${e}`).join("\n")
                    }\n- ${t("messages.logFile")}: ${
                      L.getLogFilePath("error")
                    }\n`
                    : ""
                }- ${t("messages.extractLog")}: ${L.getLogFilePath("log")}\n${
                  t("messages.duration")
                }: ${duration}`,
              }],
            };
          } catch (error) {
            return {
              content: [{
                type: "text",
                text: `${t("messages.failedStatus")}: ${
                  (error as Error).message
                }`,
              }],
              isError: true,
            };
          }

        /**
         * Create password map tool
         *
         * Creates a password mapping file.
         *
         * Parameters:
         * - passwordMap (object, required): Password mapping object in the format
         *   { "filePath or fileName or fileExtension": "password" }
         * - outputPath (string, required): Password mapping file output path
         */
        case "create_password_map":
          try {
            const passwordMap = argsObj.passwordMap as Record<string, string>;
            const outputPath = argsObj.outputPath as string;

            fs.writeFileSync(outputPath, JSON.stringify(passwordMap, null, 2));
            return {
              content: [{
                type: "text",
                text: `${t("mcp.passwordMapCreated")}: ${outputPath}`,
              }],
            };
          } catch (error) {
            return {
              content: [{
                type: "text",
                text: `${t("mcp.passwordMapCreationFailed")}: ${(error as Error).message}`,
              }],
              isError: true,
            };
          }

        default:
          return {
            content: [{
              type: "text",
              text: `${t("mcp.unknownTool")}: ${name}`,
            }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `${t("mcp.requestError")}: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}