# [1.1.0](https://github.com/oleg-koval/agent-hygiene-linter/compare/v1.0.1...v1.1.0) (2026-06-22)


### Bug Fixes

* address CodeRabbit review on action.yml and tag-major.yml ([05d26fb](https://github.com/oleg-koval/agent-hygiene-linter/commit/05d26fb258b277230a03e3174f6470eef9c7e58c))


### Features

* publish as a GitHub Action and remove duplicate release workflow ([431d58e](https://github.com/oleg-koval/agent-hygiene-linter/commit/431d58eb5eced2722e1ff208566608b762a1612d))

## [1.0.1](https://github.com/oleg-koval/agent-hygiene-linter/compare/v1.0.0...v1.0.1) (2026-06-21)


### Bug Fixes

* exit cleanly on EPIPE when stdout is closed early ([80d31e3](https://github.com/oleg-koval/agent-hygiene-linter/commit/80d31e32a807c0815fd9624fc7e8e7cbdf1e59be))

# 1.0.0 (2026-06-21)


### Bug Fixes

* disable release commit hooks in ci ([692de5d](https://github.com/oleg-koval/agent-hygiene-linter/commit/692de5d1fc8a6dc37f7dd9921dd18802b5c98dd0))
* disable release hooks in github actions ([f28cb64](https://github.com/oleg-koval/agent-hygiene-linter/commit/f28cb64ca1752ea9b4a4908051f372c6e82bb170))
* ignore generated changelog in prettier ([799586d](https://github.com/oleg-koval/agent-hygiene-linter/commit/799586d93f1bd819cce38d9dd5348f70fcdc6618))
* skip npm publish in release workflow ([32f9653](https://github.com/oleg-koval/agent-hygiene-linter/commit/32f9653ada672cd0945cf9839360136b19107abe))


### Features

* **fix:** add --fix to scaffold missing agent-readiness files ([d9334c9](https://github.com/oleg-koval/agent-hygiene-linter/commit/d9334c9db33f4aeae262711eb8cbd9bf36f6f2c0))
* publish playbook runner docs ([77405dc](https://github.com/oleg-koval/agent-hygiene-linter/commit/77405dcb7665f336af6cb6e3f0bae5d4797db36d))
* regenerate readme icon ([f4897fe](https://github.com/oleg-koval/agent-hygiene-linter/commit/f4897fe7b57ef07feada777fb43c8be82a6f8e9b))
* release ai refactor playbook runner ([8e63675](https://github.com/oleg-koval/agent-hygiene-linter/commit/8e63675f7822a44784cdc18c70a7f1f16f6e375d))

# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
semantic-release manages entries from git tags and commit messages.

## [1.1.0](https://github.com/oleg-koval/agent-hygiene-linter/compare/v1.0.2...v1.1.0) (2026-05-29)

### Features

* cleaned up project branding; removed dead refactor-runner code

## [1.0.2](https://github.com/oleg-koval/agent-hygiene-linter/compare/v1.0.1...v1.0.2) (2026-05-29)

### Bug Fixes

* ignore generated changelog in prettier

## [1.0.1](https://github.com/oleg-koval/agent-hygiene-linter/compare/v1.0.0...v1.0.1) (2026-05-29)

### Bug Fixes

* disable release hooks in github actions

## 1.0.0 (2026-05-29)

### Features

* initial release of agent-hygiene-linter — scores repo hygiene for agents and humans
