 # Contributing

Thanks for contributing to CSC-3100-AMA. Please follow these guidelines so the project remains consistent and easy to maintain.

## Development workflow

1. Create a focused branch from the latest `main` branch:
	```bash
	git checkout main
	git pull
	git checkout -b feature/short-description
	```
2. Make one logically related change at a time.
3. Run the project’s available tests and checks before committing.
4. Open a pull request against `main` with a concise summary and testing notes.

## Code style

- Prefer clear, readable code over clever or overly compact code.
- Use descriptive names and keep functions and modules focused.
- Match the formatting and naming conventions already used in nearby code.
- Add comments only when they explain non-obvious reasoning; keep them current.
- Do not commit generated files, build artifacts, secrets, or local configuration.

## Commits and pull requests

- Write imperative, specific commit messages, such as `Add input validation`.
- Keep commits small and reviewable.
- Pull requests should explain what changed, why it changed, and how it was tested.
- Update documentation when behavior, setup, or public interfaces change.
- Address review feedback and ensure all checks pass before requesting approval.

## Reporting issues

Include steps to reproduce, expected and actual behavior, relevant environment details, and logs or screenshots when useful. Never include passwords, tokens, or other sensitive information.
