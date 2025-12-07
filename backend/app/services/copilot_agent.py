from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any, Dict, List, Optional

from google.genai import types
from pymongo.database import Database

from ai_agents.models import get_gemini_client
from backend.app.core.config import settings
from backend.app.core.copilot_tool_declarations import COPILOT_TOOL_DECLARATIONS
from backend.app.core.copilot_tools import execute_copilot_tool


class CopilotAgent:
    """
    Gemini-powered agent for the Staff Copilot.
    Handles conversation state, tool execution, and response synthesis.
    """

    def __init__(self) -> None:
        self.sessions: Dict[str, List[types.Content]] = {}
        self.max_history = 12
        self.max_turns = 4

    def _system_content(self) -> types.Content:
        text = (
            "SYSTEM: You are Staff Copilot, an internal assistant for loan processing.\n"
            "- Be concise, action-oriented, and cite data you fetched.\n"
            "- Use available tools to fetch or update data before answering.\n"
            "- When presenting results, summarize first, then give key metrics or bullet points.\n"
            "- If a request is ambiguous, ask a short clarifying question.\n"
            "- Never fabricate data; prefer to say what you verified or could not find.\n"
        )
        return types.Content(role="user", parts=[types.Part(text=text)])

    def _init_session(self, session_id: str) -> List[types.Content]:
        history = [self._system_content()]
        self.sessions[session_id] = history
        return history

    def _prepare_user_text(self, prompt: str, context: Optional[Dict[str, Any]]) -> str:
        if context:
            return f"{prompt}\n\nContext:\n{json.dumps(context, default=str, indent=2)}"
        return prompt

    async def chat(
        self,
        prompt: str,
        *,
        db: Database,
        context: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run a chat turn with Gemini + function calling.
        """
        client = get_gemini_client()
        if not client:
            return {
                "reply": "AI copilot is not configured (missing GOOGLE_API_KEY).",
                "session_id": session_id or "n/a",
                "used_tools": [],
                "tool_results": [],
            }

        sid = session_id or str(uuid.uuid4())
        history = self.sessions.get(sid) or self._init_session(sid)

        tool_config = types.Tool(function_declarations=COPILOT_TOOL_DECLARATIONS)
        gen_config = types.GenerateContentConfig(tools=[tool_config], temperature=0.2)

        user_text = self._prepare_user_text(prompt, context)
        contents: List[types.Content] = [*history, types.Content(role="user", parts=[types.Part(text=user_text)])]

        used_tools: List[Dict[str, Any]] = []
        tool_results: List[Dict[str, Any]] = []
        reply_text: Optional[str] = None

        for _ in range(self.max_turns):
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL_VERSION,
                contents=contents,
                config=gen_config,
            )

            if not response.candidates:
                reply_text = reply_text or "No response generated."
                break

            candidate = response.candidates[0]
            if not candidate.content or not getattr(candidate.content, "parts", None):
                reply_text = reply_text or "No response generated."
                break

            contents.append(candidate.content)
            first_part = candidate.content.parts[0]

            # Function calling
            if hasattr(first_part, "function_call") and first_part.function_call:
                fc = first_part.function_call
                fn_name = fc.name
                fn_args = dict(fc.args) if fc.args else {}

                try:
                    result = await execute_copilot_tool(fn_name, fn_args, db)
                    used_tools.append({"name": fn_name, "args": fn_args})
                    tool_results.append({"name": fn_name, "result": result})
                except Exception as exc:  # pragma: no cover - defensive
                    result = {"error": str(exc)}

                # Send tool result back to the model
                contents.append(
                    types.Content(
                        role="function",
                        parts=[
                            types.Part(
                                function_response=types.FunctionResponse(
                                    name=fn_name,
                                    response=result,
                                )
                            )
                        ],
                    )
                )
                continue

            # Plain text response
            text_parts = [p.text for p in candidate.content.parts if getattr(p, "text", None)]
            reply_text = "\n".join([t for t in text_parts if t]) if text_parts else reply_text
            break

        if reply_text is None:
            reply_text = "I could not generate a response right now."

        # Persist trimmed history
        self.sessions[sid] = contents[-self.max_history :]

        return {
            "reply": reply_text,
            "session_id": sid,
            "used_tools": used_tools,
            "tool_results": tool_results,
            "context_echo": context or {},
        }


copilot_agent = CopilotAgent()
