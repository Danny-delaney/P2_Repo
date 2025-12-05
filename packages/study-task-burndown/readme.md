# **P2 – Study Task Burndown Component (@c00286125)**

This project implements a reusable Svelte/SvelteKit component packaged for reuse, along with a demo page, authentication-dependent behaviour, and a supporting API route.

---

## **Overview**

The repository contains:

### **✔ Reusable Svelte Component Package**
Located in:

```
packages/study-task-burndown/
```

Exports a fully reusable SVG-based burndown chart:

- Multiple tasks  
- Remaining subtasks per day  
- Combined ideal burndown line  
- Toggleable per-task visibility  
- Title, legend, and ideal-line customisation  

### **✔ Demo Page**

```
src/routes/demo/+page.svelte
```

Shows how the component works with example data.  
Updates automatically when date ranges or subtasks change.

### **✔ Authentication Feature**

The demo page includes a login-dependent action:

- Logged-out users → asked to authenticate  
- Logged-in users → can “save” their study plan  

Uses the API route:

```
src/routes/api/save-plan/+server.ts
```

### **✔ API Endpoint**

Handles POST submissions from the demo page.  
Validates login status and returns a JSON response.

### **✔ Local Copy for App + Storybook**

A second copy of the component exists at:

```
src/lib/StudyTaskBurndown.svelte
```

This is used by the app and Storybook.

---

## **Storybook**

Storybook was installed with:

```bash
npx storybook@latest init --type sveltekit
```

A custom story is included at:

```
src/stories/StudyTaskBurndown.stories.svelte
```

### ⚠ Windows Issue

On this machine, Storybook cannot dynamically import *any* `.stories.svelte` files (including Storybook’s own defaults).  
This appears to be a **local Storybook/Vite/Windows environment issue**, not a problem with the component.

This behaviour is documented for marking.

---

## **Running the Project**

Install dependencies:

```bash
npm install
```

Start the SvelteKit app:

```bash
npm run dev
```

Start Storybook (may error on this machine):

```bash
npm run storybook
```

---

## **Component Usage Example**

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

---

## **Completed Requirements**

✔ Reusable component  
✔ Package folder structure  
✔ Demo route  
✔ Authentication-dependent UI  
✔ API interaction  
✔ Storybook configuration + custom story  
✔ Documentation of local Storybook limitation  
✔ Clear README for submission  
