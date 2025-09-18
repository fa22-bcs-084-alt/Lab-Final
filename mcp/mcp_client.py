import asyncio
import json
from typing import Optional, List, Dict
from contextlib import AsyncExitStack
from groq import Groq
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

load_dotenv()


class MCPClient:
    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.tools: List[Dict] = []
        self.resources: Dict[str, str] = {}  # uri -> description
        self.exit_stack = AsyncExitStack()
        self.groq = Groq()
        self.conversation: List[Dict] = [
            {
                "role": "system",
                "content": (
                    "You are Hygieia, a healthcare assistant. "
                    "You can use MCP tools (like book_appointment, cancel_lab_test, etc.) "
                    "and MCP resources (like resource://appointments/{patient_id}, "
                    "resource://prescriptions/{patient_id}, resource://doctors, etc.). "
                    "Ask only for missing info. Always respond concisely."
                ),
            }
        ]

    async def connect_to_server(self, server_script_path: str):
        is_python = server_script_path.endswith(".py")
        is_js = server_script_path.endswith(".js")
        if not (is_python or is_js):
            raise ValueError("Server script must be a .py or .js file")

        command = "python" if is_python else "node"
        server_params = StdioServerParameters(command=command, args=[server_script_path], env=None)

        stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
        self.stdio, self.write = stdio_transport
        self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))
        await self.session.initialize()

        # Discover tools
        tool_response = await self.session.list_tools()
        print("\n📌 Tools:")
        for tool in tool_response.tools:
            print(f"- {tool.name}: {tool.description}")
        print("-" * 20)
        self.tools = self.convert_to_groq_tools(tool_response.tools)

        # Discover resources
        resource_response = await self.session.list_resources()
        print("\n📌 Resources:")
        for res in resource_response.resources:
            print(f"- {res.uri}: {res.description}")
            self.resources[res.uri] = res.description
        print("-" * 20)

    async def cleanup(self):
        await self.exit_stack.aclose()

    def convert_to_groq_tools(self, tools):
        groq_tools = []
        for tool in tools:
            if tool.inputSchema:
                parameters = tool.inputSchema.copy()
                if "required" not in parameters:
                    parameters["required"] = []
            else:
                parameters = {"type": "object", "properties": {}, "required": []}

            groq_tool = {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": parameters,
                },
            }
            groq_tools.append(groq_tool)
        return groq_tools

    async def process_query(self, query: str):
        if not self.tools and not self.resources:
            raise RuntimeError("No tools or resources loaded from MCP server.")

        self.conversation.append({"role": "user", "content": query})

        response = self.groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=self.conversation,
            tools=self.tools,  # tools get passed for function calling
        )

        full_text = ""
        if response.choices:
            msg = response.choices[0].message

            # Handle tool calls
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_name = tc.function.name
                    print(f"⚡ Calling tool {tool_name} with args: {tc.function.arguments}")
                    try:
                        tool_args = json.loads(tc.function.arguments)
                    except Exception:
                        tool_args = {}
                    try:
                        result = await self.session.call_tool(tool_name, tool_args)
                        tool_output = "".join(
                            [part.text for part in getattr(result, "content", []) if hasattr(part, "text")]
                        )
                    except Exception as e:
                        tool_output = f"Error calling tool {tool_name}: {e}"

                    self.conversation.append(
                        {"role": "function", "name": tool_name, "content": tool_output}
                    )

                followup = self.groq.chat.completions.create(
                    model="llama-3.3-70b-versatile", messages=self.conversation
                )
                if followup.choices and followup.choices[0].message.content:
                    full_text = followup.choices[0].message.content.strip()

            # Handle plain text responses
            elif msg.content:
                full_text = msg.content.strip()

        # Print Groq reply
        if full_text:
            print(f"Groq: {full_text}")
            self.conversation.append({"role": "assistant", "content": full_text})


    async def fetch_resource(self, uri: str):
        """Fetch a resource dynamically from the server"""
        if not self.session:
            raise RuntimeError("Not connected to server")

        print(f"\n📥 Fetching resource {uri}...")
        try:
            result = await self.session.read_resource(uri)
            print(f"Resource {uri} → {result}")
            return result
        except Exception as e:
            print(f"❌ Failed to fetch resource {uri}: {e}")
            return None

async def chat_loop(client: MCPClient):
    print("\n💬 Start chatting with Hygieia (type 'exit' to quit)\n")
    while True:
        query = input("You: ").strip()
        if query.lower() in ["exit", "quit"]:
            print("👋 Ending chat.")
            break

        # If user enters "resource://..." → fetch directly
        if query.startswith("resource://"):
            try:
                await client.fetch_resource(query)
            except Exception as e:
                print("⚠️ Resource error:", e)
        else:
            try:
                await client.process_query(query)
            except Exception as e:
                print("⚠️ Error:", e)


async def main():
    client = MCPClient()
    try:
        await client.connect_to_server("C:/Users/Admin/Desktop/Hygieia-Backend/mcp/mcp_server.py")
        await client.fetch_resource("resource://doctors")
        await chat_loop(client)
    finally:
        await client.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
