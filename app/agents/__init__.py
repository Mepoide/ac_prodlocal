from app.agents.base import Agent
from app.agents.jira_task_builder import AGENT as jira_task_builder
from app.agents.ocr import AGENT as ocr

AGENTS: dict[str, Agent] = {
    jira_task_builder.id: jira_task_builder,
    ocr.id: ocr,
}

DEFAULT_AGENT_ID = jira_task_builder.id


def get_agent(agent_id: str) -> Agent:
    return AGENTS.get(agent_id, AGENTS[DEFAULT_AGENT_ID])


def list_agents() -> list[Agent]:
    return list(AGENTS.values())
