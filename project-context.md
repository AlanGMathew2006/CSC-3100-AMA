# Project Context: Campus Provision Tracker

## Product
A tool to optimize nutritional value and dining dollar usage of cal poly student food intake using an algorithm

## Users
- Students: view dining dollar usage, and get optimized food recomendations.

## Evidence
- Students need a better way of optimizing their dining dollar usage
- Student wants good food recomendations based on their nutritional needs.

## Confirmed decisions
- Students can view their current dining dollars amount.
- Students can edit filters for their specific nutritional needs

## Constraints
- Do not include real student customer addresses, names, or package IDs in GenAI prompts.
- The system must support poor cellular connectivity for users.

## Open questions
- How should amount of meals per day for the student be calculated?
- What types of nutritional filters be part of the app

## Task prompt pattern
Using only the evidence and confirmed decisions above:

1. Draft one user story for a named user.
2. Draft Given / When / Then acceptance criteria.
3. List assumptions separately.
4. List questions that require a manager or stakeholder decision.
5. Do not invent policy, timing, or privacy requirements.