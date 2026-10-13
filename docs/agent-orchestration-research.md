# Research: graph-based agent orchestration

**Question:** Should a plan → implementation → testing/review workflow be defined in agent instructions, implemented programmatically, or built with a library?

**Scope note:** “Graph agents” can mean either (1) agents coordinated using a graph/state-machine workflow, or (2) agents that reason over a knowledge graph. The user’s requested planning, implementation, testing, and revision stages fit the first meaning. A knowledge graph is a data/retrieval layer and does not itself schedule agent work.

## Recommendation

For this repository’s proposed coding workflow, start with the agent runner’s native orchestration mechanism, if available, and make the sequence and gates explicit. Keep `AGENTS.md`/skills as the policy and task instructions; they explain what each stage must produce, but do not guarantee that separate processes are spawned. Use a programmatic graph only if the runner cannot reliably enforce ordered delegation, bounded retries, persisted run state, approval pauses, or evidence-based completion.

Do not add a graph framework to the product’s `package.json` just to describe a workflow for a coding agent. First establish which agent runner will execute it. Libraries are runtime-specific and not interchangeable with repo instructions.

## What a graph provides

A graph workflow has **state** (artifacts and status), **nodes** (work steps), and **edges** (allowed transitions). Conditional edges route based on explicit outcomes; loops repeat a stage under a termination condition. This makes sequencing and stop conditions inspectable instead of relying entirely on a prompt to improvise control flow. LangGraph’s JavaScript docs describe this model as discrete steps connected through shared state, with nodes and edges defining the workflow. [1]

For the requested workflow, a useful conceptual graph is:

```text
START → clarify/scope → plan → plan gate → implement → test → review
                                              ↑          │        │
                                              └─ fix ────┴─ findings
                                                        │
                                      all gates pass ──→ DONE
                                      blocked/limit ───→ ESCALATE
```

The coordinator owns routing and final status. The planning agent should not implement; the implementation agent should receive approved, bounded tasks; the test/review agents should return concrete findings and evidence. Repeat only for actionable findings, cap iterations, and escalate unresolved issues. This is a recommended design, not framework-specific behavior.

## Instructions/configuration versus programmatic orchestration

| Approach | Good fit | Limitation |
|---|---|---|
| `AGENTS.md` and skills | Define durable repo rules, each role’s inputs/outputs, quality bar, and when to delegate | Instructions alone are not an execution engine; whether they trigger separate agents is runner-dependent. They do not inherently enforce a DAG, retries, persistence, or machine-checked gates. |
| Runner-native orchestration | Multi-agent dispatch, task dependencies, coordinator loops, worker completion, approval gates | Tied to the installed runner and its version/capabilities. Prefer it over introducing a second orchestration runtime when it meets the need. |
| Programmatic graph/library | Explicit transitions, bounded loops, typed state, checkpoints, pause/resume, deterministic gate logic | Adds code, dependency and runtime operations, and integration burden. You must still supply prompts/tools and define the acceptance criteria. |
| Direct sequential code | Fixed small pipeline and simple conditional retry | May become awkward when durable state, human approval, recovery, or dynamic branches are needed. |

OpenAI Agents SDK documentation distinguishes **handoffs** (transfer control to another agent) from **agents as tools** (a manager calls specialists and retains control), and also documents code-driven orchestration for sequential/parallel/evaluator patterns. For a coding workflow where one coordinator must own completion, manager-controlled delegation or direct code orchestration is a closer conceptual match than uncontrolled handoffs. [2]

## Candidate libraries and when they fit

### LangGraph (JavaScript/TypeScript)

LangGraph is a low-level option when the workflow needs explicit state, nodes, conditional routing, loops, and persistence. Its JavaScript guide describes stateful graph construction; its documentation also covers checkpointing and human-in-the-loop interrupts. [1][3] Consider it if the workflow is an application/service you own and must resume after interruption or expose durable approvals. It is likely unnecessary for a repo-local agent instruction convention if the existing runner already dispatches and coordinates workers.

### OpenAI Agents SDK (JavaScript/TypeScript)

This SDK provides agents, handoffs, manager-style agents-as-tools, and code orchestration patterns. [2] It is relevant if implementing an application using that SDK; it is not a generic configuration format for other coding-agent runners. Prefer deterministic TypeScript orchestration for mandatory stages and bounded loops, rather than letting an LLM freely choose whether required verification happens.

### Google ADK

Google ADK documents workflow controllers such as `SequentialAgent` and `LoopAgent`: a fixed sequence and a repeated workflow. [4] These illustrate the same design pattern, but choosing ADK would make sense only if the implementation is already built on that ecosystem. The framework’s existence is not a reason to add it to this repository.

## Practical decision for this repo

1. **Define the contract in repo guidance.** Add concise rules to `AGENTS.md` and/or a focused workflow skill: planning output, required plan approval, implementation boundaries, test/review deliverables, retry cap, and escalation conditions.
2. **Use the actual runner to execute it.** The installed runner must support spawning distinct workers and coordinator-controlled sequencing for the “different sub-agent” requirement. Repo instructions cannot create that capability by themselves.
3. **Keep workflow artifacts separate from policy.** The plan and task status belong in the task tracker chosen by repo convention (this repo designates GitHub Issues); `AGENTS.md` describes the process, not each task’s transient state.
4. **Add code only for missing guarantees.** If runner-native orchestration cannot bound loops or enforce gates, implement the smallest controller around its agent APIs. Keep graph state narrow and typed: request, approved plan/tasks, implementation result, test evidence, review findings, iteration count, and terminal status.
5. **Make completion objective.** `DONE` should require acceptance criteria satisfied and recorded verification; test failures or unresolved review findings return to implementation, while missing information, unsafe changes, and retry exhaustion route to escalation. Never let the reviewer approve based on “looks good” alone.

### Bottom line

A graph is not mandatory. Instructions specify the workflow; an orchestration-capable runner executes it. A library is justified when the execution needs reliability/control features the runner cannot supply. For the current request, first configure/use the runner’s native coordinator + worker features; only then consider a graph library if an enforceable, durable programmatic workflow is still needed.

## Sources

1. LangChain, **Thinking in LangGraph (JavaScript)**: https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph
2. OpenAI, **Agent orchestration | OpenAI Agents SDK (JavaScript)**: https://openai.github.io/openai-agents-js/guides/multi-agent/
3. LangChain, **Interrupts / human-in-the-loop (JavaScript)**: https://docs.langchain.com/oss/javascript/langgraph/interrupts
4. Google, **Workflow agents**: https://google.github.io/adk-docs/agents/workflow-agents/
