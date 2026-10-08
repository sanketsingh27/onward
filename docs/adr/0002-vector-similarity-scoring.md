# Vector similarity scoring (Vectorize)

Fit is scored by embedding similarity, not a judge model: the resume and each opening's description are embedded (Workers AI), and fit is the cosine similarity between them, surfaced as 0–100. This replaces the Jev "System One" judge from ADR-0001 because one embedding pass plus a single vector query scores the whole candidate set, where Jev required a paid, per-opening call and produced a skill/experience/seniority breakdown and a confidence value the product no longer needs.

Consequences: there is no three-part breakdown and no per-score confidence — the ranking signal is one similarity number. A one-line reason for the top-N openings is retained as a separate LLM explanation layer, independent of scoring.
