# P2 – Study Task Burndown Component (@c00286125)

This repository implements a reusable Svelte/SvelteKit study-task burndown component, packaged so it can be installed directly from a Git repository.
It includes a demo page, an authentication-based save action, and a supporting API route.

## 1. Overview

### 1. Reusable Svelte Component Package
Location:

```
packages/study-task-burndown/
```

Exports an SVG-based burndown chart supporting:
- Multiple tasks
- Remaining subtasks per day
- Ideal burndown line
- Toggleable visibility per task
- Custom date ranges

### 2. Demo Page

```
src/routes/demo/+page.svelte
```

Features:
- Example dataset
- Dynamic updates based on date range and completion
- Authenticated and non-authenticated views

### 3. Authentication Feature

The demo reacts to login state.
When signed in, users can save their study plan through:

```
src/routes/api/save-plan/+server.ts
```

### 4. API Endpoint

Handles POST requests, checks authentication state, and returns JSON results.

### 5. Local Component Copy for App and Storybook

A second development copy exists at:

```
src/lib/StudyTaskBurndown.svelte
```

### 6. Storybook

Custom story:

```
src/stories/StudyTaskBurndown.stories.svelte
```

Note: On this Windows machine, Storybook cannot dynamically import `.stories.svelte`. This is a local environment limitation.

## 2. Installation Guide

### A. Install the package in another project

```
npm install git+https://github.com/Danny-delaney/P2_Repo.git#v0.1.0
```

Use in Svelte/SvelteKit:

```svelte
<script>
  import StudyTaskBurndown from '@c00286125/study-task-burndown';
</script>

<StudyTaskBurndown
  {startDate}
  {dueDate}
  {tasks}
/>
```

### B. Running this repository

Install dependencies:

```
npm install
```

Start SvelteKit:

```
npm run dev
```

Run Storybook (may fail on this Windows setup):

```
npm run storybook
```

## 3. Component Usage Example

```svelte
<script>
  import StudyTaskBurndown from '@c00286125/study-task-burndown';

  let tasks = [
    {
      title: 'Essay draft',
      subtasksNum: 8,
      subtasks: [
        { completedDate: '2025-03-01' },
        { completedDate: '2025-03-02' },
        { completedDate: null }
      ]
    }
  ];

  let startDate = '2025-03-01';
  let dueDate = '2025-03-07';
</script>

<StudyTaskBurndown {tasks} {startDate} {dueDate} />
```

## 4. Completed Requirements

- Reusable component package
- Proper package structure under `packages/`
- Demo route implementation
- Authentication-based UI logic
- API integration
- Storybook story
- Documentation of environment limitations
- Clear installation and usage instructions
