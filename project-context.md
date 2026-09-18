# Project Context: Last-Mile Delivery Tracker

## Product
A web and mobile system for tracking packages from the local delivery hub to the customer’s address.

## Users
- Managers: monitor operations, delivery performance, and exceptions.
- Drivers: view assigned stops and update delivery status.
- Customer service: investigate delayed or failed deliveries.
- Customers: view package status and estimated arrival time.

## Evidence
- Drivers need a quick way to record a delivery attempt.
- Customers want to know whether their package will arrive today.
- Customer service needs a clear history of delivery events.
- Managers need to identify routes with repeated delays.

## Confirmed decisions
- Drivers can update status from a mobile device.
- Customers can view status without seeing other customers’ information.
- Each status update records a time and location.
- Customer service can view the delivery-event history.

## Constraints
- Do not include real customer addresses, names, or package IDs in GenAI prompts.
- Status changes must preserve an audit history.
- The system must support poor cellular connectivity for drivers.
- Managers approve operational policies; the team does not invent them.

## Open questions
- Which delivery statuses are allowed?
- How long should a driver be able to work offline?
- When should the system notify a customer about a delay?
- What information may managers see about driver performance?

## Task prompt pattern
Using only the evidence and confirmed decisions above:

1. Draft one user story for a named user.
2. Draft Given / When / Then acceptance criteria.
3. List assumptions separately.
4. List questions that require a manager or stakeholder decision.
5. Do not invent policy, timing, or privacy requirements.