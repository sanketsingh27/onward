# Hybrid scoring judge (Jev + LLM)

> Status: **deprecated** — superseded by ADR-0002 (vector similarity scoring replaced the Jev judge).



Skill-match, experience and seniority are scored by Jev — TypeSafe's typed "System One" decision model — not a general LLM, because it returns a constrained, calibrated score with a confidence value in 70–500 ms at roughly $0.0001 per call, but cannot write a free-text explanation. A general LLM is therefore used only to write the one-line reason for the top-N openings, so the expensive, slow explanation is spent only where the job-seeker actually reads it.

Considered options: Jev alone (no "why"), a general LLM for both score and reason (~100× the cost, slower, JSON-parsing fragility), hybrid (chosen). The two-stage shape — score every survivor cheaply, reason only the top-N — is a consequence of Jev's constraints, so the choice is more structural than a single library swap.
