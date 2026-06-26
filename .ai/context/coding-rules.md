# AI Workspace Context: Coding Rules

Every agent operating within this workspace must strictly follow these rules:

1.  **Multi-Tenant Scoping**: Never write project, job, or finding queries without specifying a `merchant_id` constraint extracted from the authenticated user's JWT metadata.
2.  **DTO Input Validation**: Never bypass request payload validations. Every endpoint must declare a class-validator annotated DTO.
3.  **Controllers are Routers**: Never put business validations, external integrations, or database writes inside controllers.
4.  **No Direct HTTP in Repositories**: Repositories must handle SQL/ORM statements only. External integrations (such as GitLab API calls) belong inside client services.
5.  **Clean Output Sanitization**: Never return raw entity rows containing passwords, tokens, or webhook secrets to controllers or client responses.
6.  **No TODO Placeholders**: Never commit placeholder blocks or `TODO` annotations.
7.  **No Unrelated Churn**: Modify only files listed in the task definition. Do not run unrelated code cleaning or refactorings in other scopes.
