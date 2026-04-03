import os
from typing import Dict, Any, Callable


def build_agent(config: Dict[str, Any]) -> Callable:
    model_id = config.get("model", "mock")
    role = config.get("role", "assistant")
    system_prompt = config.get("system_prompt") or f"You are a helpful {role} agent."

    llm = _get_llm(model_id)

    def agent_fn(state: dict) -> dict:
        messages = state.get("messages", [])
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        response = llm.invoke(full_messages)
        content = response.content if hasattr(response, "content") else str(response)
        new_messages = messages + [{"role": "assistant", "content": content}]
        return {**state, "messages": new_messages, "current_output": content}

    return agent_fn


def _get_llm(model_id: str):
    if model_id.startswith("gpt"):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model_id, api_key=os.getenv("OPENAI_API_KEY", ""))

    if model_id.startswith("claude"):
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model_id, api_key=os.getenv("ANTHROPIC_API_KEY", ""))

    if model_id.startswith("gemini"):
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model_id,
            google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        )

    if model_id.startswith("llama"):
        from langchain_groq import ChatGroq
        return ChatGroq(model=model_id, api_key=os.getenv("GROQ_API_KEY", ""))

    # Fallback: mock LLM
    from langchain_core.language_models.fake import FakeListChatModel
    return FakeListChatModel(responses=["[Mock agent response — set MOCK_MODE=false and add API keys to use real LLMs]"])
