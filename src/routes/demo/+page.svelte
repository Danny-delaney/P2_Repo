<script>
  // Provided by SvelteKit layout
  export let data;
  const user = data?.user ?? null;

  import StudyTaskBurndown from '@c00286125/study-task-burndown';

  const toISO = (d) => d.toISOString().slice(0, 10);
  const addDays = (d, n) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
  };

  const today = new Date();
  let startDate = toISO(today);
  let dueDate = toISO(addDays(today, 6)); // still used as a convenience default

  // Build a subtasks array given total + completed
  function buildSubtasks(total, completed, completionDateISO) {
    return Array.from({ length: total }, (_, i) => ({
      completedDate: i < completed ? completionDateISO : null
    }));
  }

  // Initial demo tasks
  const d0 = toISO(today);
  const d1 = toISO(addDays(today, 1));
  const d2 = toISO(addDays(today, 2));
  const d3 = toISO(addDays(today, 3));
  const d4 = toISO(addDays(today, 4));

  let tasks = [
    {
      title: 'Essay draft',
      subtasksNum: 8,
      subtasks: buildSubtasks(8, 3, d0), // 3 done
      dueDate: d2
    },
    {
      title: 'Stats problem set',
      subtasksNum: 6,
      subtasks: buildSubtasks(6, 4, d1), // 4 done
      dueDate: dueDate
    },
    {
      title: 'Reading + notes',
      subtasksNum: 10,
      subtasks: buildSubtasks(10, 2, d0), // 2 done
      dueDate: d4
    }
  ];

  // ---------- Task customiser helpers ----------

  // Read current "completed count" from a task
  function countCompleted(task) {
    return task.subtasks.filter((s) => s && s.completedDate).length;
  }

  function updateTask(index, updater) {
    const copy = tasks.slice();
    const t = { ...copy[index] };
    updater(t);
    copy[index] = t;
    tasks = copy;
  }

  function updateTaskTitle(index, value) {
    updateTask(index, (t) => {
      t.title = value;
    });
  }

  function updateTaskTotal(index, value) {
    const total = Math.max(0, Number(value) || 0);
    updateTask(index, (t) => {
      const completed = Math.min(countCompleted(t), total);
      t.subtasksNum = total;
      t.subtasks = buildSubtasks(total, completed, startDate);
    });
  }

  function updateTaskCompleted(index, value) {
    const completed = Math.max(0, Number(value) || 0);
    updateTask(index, (t) => {
      const total = t.subtasksNum || t.subtasks.length || 0;
      const clamped = Math.min(completed, total);
      t.subtasks = buildSubtasks(total, clamped, startDate);
    });
  }

  function updateTaskDueDate(index, value) {
    updateTask(index, (t) => {
      t.dueDate = value || t.dueDate;
    });
  }

  function removeTask(index) {
    const copy = tasks.slice();
    copy.splice(index, 1);
    tasks = copy;
  }

  // ---------- Add new task ----------

  let newTitle = '';
  let newTotal = 5;
  let newCompleted = 0;
  let newDueDate = dueDate;

  function addTask() {
    if (!newTitle.trim()) return;
    const total = Math.max(0, Number(newTotal) || 0);
    const completed = Math.min(Math.max(0, Number(newCompleted) || 0), total);
    const due = newDueDate || dueDate || startDate;

    const task = {
      title: newTitle.trim(),
      subtasksNum: total,
      subtasks: buildSubtasks(total, completed, startDate),
      dueDate: due
    };

    tasks = [...tasks, task];

    // reset form
    newTitle = '';
    newTotal = 5;
    newCompleted = 0;
    newDueDate = due;
  }

  // ---------- Optional save to API ----------

  let saveMessage = '';

  async function handleSave() {
    saveMessage = '';

    const payload = {
      startDate,
      dueDate,
      tasks
    };

    try {
      const res = await fetch('/api/burndown', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let error = 'Could not save plan (not signed in?)';
        try {
          const data = await res.json();
          if (data?.error) error = data.error;
        } catch {
          // ignore JSON parse errors
        }
        saveMessage = error;
        return;
      }

      saveMessage = 'Saved your study plan for this user.';
    } catch (err) {
      console.error(err);
      saveMessage = 'Network error while saving.';
    }
  }
</script>

<section class="intro">
  <h1>Study Task Burndown demo</h1>
  <p>
    This page lets you fully customise the tasks that feed into the burndown chart:
    titles, total subtasks, how many are done, and each task's due date.
  </p>

  <div class="dates-row">
    <label>
      Plan start date
      <input type="date" bind:value={startDate} />
    </label>
    <label>
      Convenience due date
      <input type="date" bind:value={dueDate} />
      <span class="hint">
        Used as a default when you add new tasks. Each task still has its own due date.
      </span>
    </label>
  </div>

  {#if user}
    <button class="primary" on:click|preventDefault={handleSave}>
      Save this plan to my account
    </button>
    {#if saveMessage}
      <p class="message">{saveMessage}</p>
    {/if}
  {:else}
    <p class="message">Sign in to save this plan to your account.</p>
  {/if}
</section>

<section class="task-editor">
  <h2>Tasks</h2>

  {#if tasks.length === 0}
    <p class="empty">No tasks yet. Add one below.</p>
  {:else}
    <div class="task-list">
      {#each tasks as task, i}
        <div class="task-card">
          <div class="task-header">
            <h3>Task {i + 1}</h3>
            <button type="button" class="ghost danger" on:click={() => removeTask(i)}>
              Remove
            </button>
          </div>

          <div class="task-grid">
            <label>
              Title
              <input
                type="text"
                bind:value={task.title}
                on:input={(e) => updateTaskTitle(i, e.target.value)}
              />
            </label>

            <label>
              Total subtasks
              <input
                type="number"
                min="0"
                bind:value={task.subtasksNum}
                on:input={(e) => updateTaskTotal(i, e.target.value)}
              />
            </label>

            <label>
              Completed subtasks
              <input
                type="number"
                min="0"
                max={task.subtasksNum}
                value={countCompleted(task)}
                on:input={(e) => updateTaskCompleted(i, e.target.value)}
              />
            </label>

            <label>
              Task due date
              <input
                type="date"
                bind:value={task.dueDate}
                on:input={(e) => updateTaskDueDate(i, e.target.value)}
              />
            </label>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="add-task">
    <h3>Add a new task</h3>
    <div class="task-grid">
      <label>
        Title
        <input type="text" bind:value={newTitle} placeholder="e.g. Literature review" />
      </label>

      <label>
        Total subtasks
        <input type="number" min="0" bind:value={newTotal} />
      </label>

      <label>
        Completed subtasks
        <input type="number" min="0" bind:value={newCompleted} />
      </label>

      <label>
        Task due date
        <input type="date" bind:value={newDueDate} />
      </label>
    </div>

    <button type="button" class="primary" on:click={addTask}>
      Add task
    </button>
  </div>
</section>

<section class="chart-section">
  <StudyTaskBurndown {startDate} {tasks} />
</section>

<style>
  section.intro {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: #ffffff;
    border: 1px solid #e2e2e2;
  }

  h1 {
    margin: 0 0 0.4rem;
    font-size: 1.4rem;
  }

  h2 {
    margin: 0 0 0.6rem;
    font-size: 1.2rem;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
  }

  .message {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #4b5563;
  }

  .dates-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
    margin-bottom: 0.75rem;
  }

  label {
    font-size: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  input[type='date'],
  input[type='text'],
  input[type='number'] {
    padding: 0.35rem 0.5rem;
    font-size: 0.9rem;
    border-radius: 0.4rem;
    border: 1px solid #ccc;
  }

  .hint {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .primary {
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    border: none;
    background: #2563eb;
    color: white;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .primary:hover {
    background: #1d4ed8;
  }

  .task-editor {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: #ffffff;
    border: 1px solid #e5e7eb;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .task-card {
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    padding: 0.75rem;
    background: #f9fafb;
  }

  .task-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .task-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
  }

  .ghost {
    border-radius: 999px;
    border: 1px solid #d1d5db;
    background: transparent;
    padding: 0.25rem 0.7rem;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .ghost.danger {
    color: #b91c1c;
    border-color: #fecaca;
  }

  .ghost.danger:hover {
    background: #fee2e2;
  }

  .add-task {
    border-top: 1px dashed #e5e7eb;
    padding-top: 0.75rem;
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .empty {
    margin: 0 0 0.75rem;
    font-size: 0.9rem;
    color: #6b7280;
  }

  .chart-section {
    margin-top: 1rem;
  }
</style>
