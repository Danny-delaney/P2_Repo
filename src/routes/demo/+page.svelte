<script>
  // comes from the root layout/server in the starter
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
  let dueDate = toISO(addDays(today, 6)); // 1-week window

  const make = (n, dates) =>
    Array.from({ length: n }, (_, i) => ({
      completedDate: dates[i] ?? null
    }));

  const d0 = toISO(today);
  const d1 = toISO(addDays(today, 1));
  const d2 = toISO(addDays(today, 2));
  const d3 = toISO(addDays(today, 3));

  let tasks = [
    {
      title: 'Essay draft',
      subtasksNum: 8,
      subtasks: make(8, [d0, d0, d1]) // 3 done
    },
    {
      title: 'Stats problem set',
      subtasksNum: 6,
      subtasks: make(6, [d1, d2, d3, d3]) // 4 done
    },
    {
      title: 'Reading + notes',
      subtasksNum: 10,
      subtasks: make(10, [d0, d0]) // 2 done
    }
  ];

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
  <h1>Multi-task study burndown</h1>
  <p>
    This test view shows three example study tasks over the same date range.
    Click task names in the legend to toggle each line on and off.
  </p>

  <div class="dates-row">
    <label>
      Start date
      <input type="date" bind:value={startDate} />
    </label>
    <label>
      Due date
      <input type="date" bind:value={dueDate} />
    </label>
  </div>
</section>

<StudyTaskBurndown {startDate} {dueDate} {tasks} />

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

  p {
    margin: 0 0 0.8rem;
    font-size: 0.95rem;
  }

  .dates-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  label {
    font-size: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  input[type='date'] {
    padding: 0.35rem 0.5rem;
    font-size: 0.9rem;
    border-radius: 0.4rem;
    border: 1px solid #ccc;
  }
</style>
