<script lang="ts">
  // Core types your package exports / uses
  export type Subtask = {
    completedDate: string | null; // 'YYYY-MM-DD' or null
  };

  export type Task = {
    title: string;
    subtasksNum: number;
    subtasks: Subtask[];
  };

  // Required props
  export let startDate: string; // 'YYYY-MM-DD'
  export let dueDate: string;   // 'YYYY-MM-DD'
  export let tasks: Task[] = [];

  // Optional customisation props
  export let title: string = 'Multi-task study burndown';
  export let showLegend: boolean = true;
  export let showIdealLine: boolean = true;

  // Simple colour palette for up to a few tasks
  const colours = [
    '#2563eb', // blue
    '#16a34a', // green
    '#f97316', // orange
    '#ec4899', // pink
    '#a855f7', // purple
    '#facc15'  // yellow
  ];

  const parseISO = (value: string): Date => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const toISO = (d: Date): string => d.toISOString().slice(0, 10);

  const shortLabel = (d: Date): string =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const clampDateRange = (start: string, end: string): [string, string] => {
    const s = parseISO(start);
    const e = parseISO(end);
    if (e < s) return [toISO(e), toISO(s)];
    return [start, end];
  };

  const getDateRange = (start: string, end: string): Date[] => {
    const [sISO, eISO] = clampDateRange(start, end);
    const startDate = parseISO(sISO);
    const endDate = parseISO(eISO);

    const range: Date[] = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      range.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return range;
  };

  const getTotalSubtasks = (task: Task): number => {
    // Prefer explicit subtasksNum, but fall back to actual subtasks length
    return typeof task.subtasksNum === 'number' && task.subtasksNum > 0
      ? task.subtasksNum
      : task.subtasks.length;
  };

  const countCompletedUpTo = (task: Task, day: Date): number => {
    const dayISO = toISO(day);
    return task.subtasks.filter((s) => {
      if (!s.completedDate) return false;
      return s.completedDate <= dayISO;
    }).length;
  };

  // Derived data --------------------------------------------------------

  $: dateRange = getDateRange(startDate, dueDate);

  type TaskSeries = {
    task: Task;
    total: number;
    remainingPerDay: number[]; // same length as dateRange
  };

  $: taskSeries = tasks.map<TaskSeries>((task) => {
    const total = getTotalSubtasks(task);
    const remainingPerDay = dateRange.map((day) => {
      const done = countCompletedUpTo(task, day);
      return Math.max(total - done, 0);
    });

    return { task, total, remainingPerDay };
  });

  $: maxRemaining = (() => {
    const allValues = taskSeries.flatMap((s) => s.remainingPerDay);
    const max = Math.max(0, ...allValues);
    return max || 1; // avoid divide-by-zero
  })();

  // Ideal (target) line that uses the same Y scale as the other series.
  // It goes from the current maxRemaining down to 0 so it stays inside the chart.
  let idealSeries: number[] | null;

  $: idealSeries = (() => {
    if (!showIdealLine || !taskSeries.length) return null;

    const start = maxRemaining;
    const n = dateRange.length;
    if (n <= 1) {
      return [start];
    }

    return dateRange.map((_, i) => {
      const t = i / (n - 1); // 0 -> 1
      const remaining = start * (1 - t);
      return remaining;
    });
  })();


  // Legend visibility state
  let visibleFlags: boolean[] = tasks.map(() => true);

  $: if (visibleFlags.length !== tasks.length) {
    visibleFlags = tasks.map(() => true);
  }

  const toggleTask = (index: number) => {
    visibleFlags = visibleFlags.map((flag, i) =>
      i === index ? !flag : flag
    );
  };

  // SVG helpers ---------------------------------------------------------

  const valueToY = (value: number): number => {
    // Map 0..maxRemaining to SVG 80..5 (top)
    const marginTop = 5;
    const marginBottom = 20;
    const chartHeight = 100 - marginTop - marginBottom;

    const ratio = maxRemaining ? value / maxRemaining : 0;
    return marginTop + chartHeight * (1 - ratio);
  };

  const indexToX = (index: number, total: number): number => {
    if (total <= 1) return 50;
    const marginLeft = 6;
    const marginRight = 5;
    const chartWidth = 100 - marginLeft - marginRight;

    return marginLeft + (chartWidth * index) / (total - 1);
  };

  const seriesToPolylinePoints = (values: number[]): string =>
    values
      .map((v, i) => `${indexToX(i, values.length)},${valueToY(v)}`)
      .join(' ');

  // Axis tick labels every N days
  $: xTickEvery = dateRange.length > 10 ? 2 : 1;
</script>

<section class="burndown-wrapper">
  {#if title}
    <header class="header">
      <h2>{title}</h2>
      <p class="subtitle">
        Remaining subtasks over time for each study task.
      </p>
    </header>
  {/if}

  <div class="chart-card">
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Multi-task study burndown chart"
    >
      <!-- Axes -->
      <line x1="6" y1="80" x2="95" y2="80" class="axis" />
      <line x1="6" y1="5" x2="6" y2="80" class="axis" />

      <!-- Ideal line -->
      {#if idealSeries}
        <polyline
          class="ideal-line"
          points={seriesToPolylinePoints(idealSeries)}
        />
      {/if}

      <!-- Task lines -->
      {#each taskSeries as series, i}
        {#if visibleFlags[i]}
          <polyline
            class="task-line"
            style={`stroke: ${colours[i % colours.length]};`}
            points={seriesToPolylinePoints(series.remainingPerDay)}
          />
        {/if}
      {/each}

      <!-- X-axis labels (dates) -->
      {#each dateRange as day, i}
        {#if i % xTickEvery === 0}
          <text
            x={indexToX(i, dateRange.length)}
            y="88"
            class="x-label"
          >
            {shortLabel(day)}
          </text>
        {/if}
      {/each}

      <!-- Y-axis labels (0 and maxRemaining) -->
      <text x="2" y={valueToY(maxRemaining)} class="y-label">
        {maxRemaining}
      </text>
      <text x="2" y={valueToY(0)} class="y-label">
        0
      </text>
    </svg>

    {#if showLegend && taskSeries.length}
      <div class="legend">
        {#each taskSeries as series, i}
          <button
            type="button"
            class:selected={visibleFlags[i]}
            on:click={() => toggleTask(i)}
          >
            <span
              class="swatch"
              style={`background-color: ${colours[i % colours.length]};`}
            />
            <span class="label">
              {series.task.title}
              <span class="meta">
                ({series.total} subtasks)
              </span>
            </span>
          </button>
        {/each}

        {#if idealSeries}
          <div class="legend-extra">
            <span class="ideal-swatch" />
            <span class="label">Ideal combined burndown</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <footer class="footer">
    <p>Study burndown component by @c00286125</p>
  </footer>
</section>

<style>
  .burndown-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .header h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  .subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: #4b5563;
  }

  .chart-card {
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    padding: 0.75rem;
    background: #ffffff;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;        /* let the viewBox control the aspect ratio */
    max-height: 260px;   /* optional cap for tall screens */
  }

  .axis {
    stroke: #d1d5db;
    stroke-width: 0.5;
  }

  .ideal-line {
    fill: none;
    stroke: #9ca3af;
    stroke-width: 0.8;
    stroke-dasharray: 3 2;
  }

  .task-line {
    fill: none;
    stroke-width: 1.4;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .x-label {
    font-size: 2.5px;
    text-anchor: middle;
    dominant-baseline: hanging;
    fill: #6b7280;
  }

  .y-label {
    font-size: 2.5px;
    text-anchor: start;
    dominant-baseline: middle;
    fill: #6b7280;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.75rem;
  }

  .legend button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .legend button.selected {
    background: #eef2ff;
    border-color: #a5b4fc;
  }

  .legend button:hover {
    background: #f3f4f6;
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .label {
    display: inline-flex;
    align-items: baseline;
    gap: 0.25rem;
  }

  .meta {
    font-size: 0.7rem;
    color: #6b7280;
  }

  .legend-extra {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    font-size: 0.8rem;
    color: #4b5563;
  }

  .ideal-swatch {
    width: 18px;
    height: 2px;
    border-radius: 999px;
    background-image: linear-gradient(
      to right,
      #9ca3af 25%,
      transparent 25%,
      transparent 50%,
      #9ca3af 50%,
      #9ca3af 75%,
      transparent 75%,
      transparent
    );
    background-size: 6px 2px;
  }

  .footer {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  @media (max-width: 640px) {
    svg {
      max-height: 220px;
    }

    .legend {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
