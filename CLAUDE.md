## Log

Always, after finishing a significant step of a prompt, add a brief summary of what was done to the CHANGELOG.md at the root of the project. Start the log with a timestamp displaying the moment of the change and a beeth description of the feature implemented in this format "{timestamp} - {feature-description}".

## Findings
After analizing the code to implement your tasks, if you find  significant issues or possible improvements, please add to the project /.docs/ai-backlog/{curent-date-time}-{file-name}.md with the issue or improvement you suggest to the project that is good to implement in the future. Keep the suggestions short and simple to understad and to follow. Those items will be futurely added to the todo list. One item per file.

## Playwright Tests
Use the best playwright test practices.

## Patterns

#### SOLID
Use this solid principle and creating individual files to each feature whenever possible to avoid long code files content.

#### KISS
Keep the application simple.

#### Hexagonal arquitecture
Keep the main and reusable features in individual consistent modules that match the context of the application without making it much complex.


