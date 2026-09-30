# Happy Tails

Happy Tails is a veterinary-clinic management application developed as the case study for the diploma thesis **Optimizing Cloud Infrastructure for Mission-Critical Applications**.

The repository contains:

- the Spring Boot and MySQL application;
- the React user interface;
- Docker, Nginx, and AWS deployment configuration;
- performance and operational evaluation scripts;
- the LaTeX thesis sources and the compiled thesis PDF.

The final presentation will be added after it has been completed and reviewed.

## Repository structure

- `pet-clinic-data/` -- domain model and persistence layer
- `pet-clinic-web/` -- Spring Boot application and React frontend
- `docker/`, `infra/` -- container and deployment configuration
- `scripts/` -- backup, diagram, and evaluation utilities
- `thesis-overleaf/` -- LaTeX sources
- `thesis/Happy-Tails-Thesis.pdf` -- compiled dissertation

## Configuration

Runtime secrets are not stored in this repository. Copy `.env.example` to `.env` and replace every `CHANGE_ME` value before running or deploying the application. The local `.env` file, generated uploads, database backups, logs, build output, and IDE files are excluded from version control.

This application builds on the Spring PetClinic reference project and retains its Apache License 2.0 basis.
