# Onward

A solo job-search tool that finds the job-seeker's next best application: it pulls open roles from a set of company job boards, drops the ones that fail hard requirements, and ranks the rest by how semantically similar they are to the resume.

## Language

### Sources

**Board**:
A single company's job board, identified by a slug, that lists that company's open roles.
_Avoid_: company, feed, source

**Board registry**:
The store of every board the tool tracks — each board's URL and feed metadata.
_Avoid_: board list, source list

**Opening**:
A specific role a company is currently hiring for, listed on a board.
_Avoid_: job, posting, role, vacancy

### The job-seeker

**Profile**:
Everything that describes the job-seeker for matching — the resume plus the filters.
_Avoid_: candidate, user settings, preferences

**Resume**:
The markdown file describing the job-seeker's skills and experience; the text that gets embedded and matched against.
_Avoid_: CV

### Matching

**Embedding**:
A vector representation of a text — the resume or an opening's description — used for similarity search.

**Similarity**:
How semantically alike two embeddings are, measured by cosine distance.

**Fit**:
The similarity between the resume and an opening, surfaced as 0–100; the ranking signal.
_Avoid_: match, relevance, score, rank

**Recall**:
The openings a vector query returns as most similar to the resume.

**Hard filter**:
A deterministic requirement that removes an opening outright when it is not met.
_Avoid_: gate, constraint

**Survivor**:
An opening that passed every hard filter and is eligible for ranking.

### Actions

**Scan**:
One run of the pipeline — fetch openings, hard-filter, embed, rank by similarity.

**Scan job**:
The background job that runs a scan and writes its results to storage.

**State**:
The job-seeker's recorded relationship to an opening — saved, applied, or dismissed.

**Application**:
The job-seeker's submission for an opening. Applying is a human action the tool hands off to, never something it performs itself.
