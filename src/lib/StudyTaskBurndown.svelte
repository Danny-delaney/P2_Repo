<script>
  // Shared date range for all tasks
  export let startDate; // "YYYY-MM-DD"
  export let dueDate;   // "YYYY-MM-DD"

  // Each task:
  // {
  //   title: string,
  //   subtasksNum?: number,
  //   subtasks: [{ completedDate: "YYYY-MM-DD" | null }]
  // }
  export let tasks = [];

  const colors = ['#3178c6', '#e67e22', '#9b59b6', '#16a085'];

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const toDate = (str) => new Date(str);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();<script lang="ts">
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


  const toISODate = (d) => d.toISOString().slice(0, 10);
  const formatLabel = (d) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  // Overall date range
  $: start = toDate(startDate);
  $: end = toDate(dueDate);

  $: dateRange = (() => {
    const out = [];
    const d = new Date(start);
    while (d <= end) {
      out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  })();

  // Build ideal + actual series for a single task
  function buildSeries(task) {
    const subtasksArr = task.subtasks || [];
    const subtasksNum = task.subtasksNum ?? subtasksArr.length;

    if (!dateRange.length) {
      return {
        subtasksNum,
        ideal: [],
        actual: [],
        completedCount: subtasksArr.filter((s) => s.completedDate).length
      };
    }

    // Ideal: straight line
    let ideal = [];
    if (dateRange.length === 1) {
      ideal = [subtasksNum];
    } else {
      const n = dateRange.length - 1;
      ideal = dateRange.map((_, i) => {
        const fraction = i / n;
        return subtasksNum * (1 - fraction);
      });
    }

    // Actual: step down on completion days
    const counts = new Map();
    for (const s of subtasksArr) {
      if (!s.completedDate) continue;
      const key = s.completedDate;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const actual = [];
    let remaining = subtasksNum;
    for (const day of dateRange) {
      const key = toISODate(day);
      const doneToday = counts.get(key) || 0;
      remaining = Math.max(0, remaining - doneToday);
      actual.push(remaining);
    }

    return {
      subtasksNum,
      ideal,
      actual,
      completedCount: subtasksArr.filter((s) => s.completedDate).length
    };
  }

  // Series for all tasks
  $: taskSeries = tasks.map(buildSeries);

  // Max subtasks across tasks for y-axis scaling
  $: maxSubtasks = Math.max(
    1,
    ...taskSeries.map((s) => s.subtasksNum || 0),
  );

  // Which tasks are visible (toggle via legend)
  let active = [];

  $: active = tasks.map((_, i) => (active[i] ?? true));

  function toggleTask(i) {
    active = active.map((on, idx) => (idx === i ? !on : on));
  }

  // "Today" index in the range
  $: todayIndex = (() => {
    const today = new Date();
    if (!dateRange.length) return 0;
    if (today <= start) return 0;
    if (today >= end) return dateRange.length - 1;

    const idx = dateRange.findIndex((d) => sameDay(d, today));
    return idx === -1 ? dateRange.length - 1 : idx;
  })();

  // Status summaries per task
  $: summaries = tasks.map((task, i) => {
    const s = taskSeries[i] || {
      subtasksNum: 0,
      ideal: [],
      actual: [],
      completedCount: 0
    };

    const total = s.subtasksNum || 0;
    const completed = s.completedCount || 0;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    const idealToday = s.ideal[todayIndex] ?? total;
    const actualToday = s.actual[todayIndex] ?? total;

    let status;
    if (actualToday > idealToday) status = 'Behind pace';
    else if (actualToday < idealToday) status = 'Ahead of pace';
    else status = 'On pace';

    return { title: task.title, total, completed, percent, status };
  });

  // Simple SVG layout
  const width = 640;
  const height = 320;
  const padding = 40;

  const xForIndex = (i) => {
    if (!dateRange.length) return width / 2;
    if (dateRange.length === 1) return width / 2;
    const inner = width - padding * 2;
    const step = inner / (dateRange.length - 1);
    return padding + step * i;
  };

  const yForRemaining = (remaining) => {
    const max = maxSubtasks || 1;
    const inner = height - padding * 2;
    const fraction = remaining / max;
    return padding + inner * (1 - fraction);
  };

  const buildPoints = (series) =>
    series.map((v, i) => `${xForIndex(i)},${yForRemaining(v)}`).join(' ');

  // x-axis ticks (start / mid / end if long)
  $: xTicks = (() => {
    if (!dateRange.length) return [];
    if (dateRange.length <= 7) {
      return dateRange.map((d, i) => ({ i, label: formatLabel(d) }));
    }
    const mid = Math.floor(dateRange.length / 2);
    return [
      { i: 0, label: formatLabel(dateRange[0]) },
      { i: mid, label: formatLabel(dateRange[mid]) },
      {
        i: dateRange.length - 1,
        label: formatLabel(dateRange[dateRange.length - 1])
      }
    ];
  })();
</script>

<div class="burndown">
  <div class="header-row">
    <h2>Study burndown</h2>
    <p class="dates">
      {startDate} → {dueDate}
    </p>
  </div>

  <!-- Legend / toggles -->
  <div class="legend">
    {#each tasks as task, i}
      <button
        type="button"
        class:off={!active[i]}
        on:click={() => toggleTask(i)}
      >
        <span
          class="swatch"
          style={`background:${colors[i % colors.length]}`}
        ></span>
        <span class="label">{task.title}</span>
      </button>
    {/each}
  </div>

  <svg
    viewBox={`0 0 ${width} ${height}`}
    role="img"
    aria-label="Study burndown for multiple tasks"
  >
    <!-- Axes -->
    <line
      x1={padding}
      y1={padding}
      x2={padding}
      y2={height - padding}
      stroke="#ccc"
      stroke-width="1"
    />
    <line
      x1={padding}
      y1={height - padding}
      x2={width - padding}
      y2={height - padding}
      stroke="#ccc"
      stroke-width="1"
    />

    <!-- Lines per task -->
    {#each tasks as task, i}
      {#if active[i]}
        <!-- Ideal for this task (dashed, light) -->
        <polyline
          points={buildPoints(taskSeries[i]?.ideal || [])}
          fill="none"
          stroke="#bbbbbb"
          stroke-width="1.5"
          stroke-dasharray="4 4"
        />
        <!-- Actual for this task (solid, colored) -->
        <polyline
          points={buildPoints(taskSeries[i]?.actual || [])}
          fill="none"
          stroke={colors[i % colors.length]}
          stroke-width="3"
        />
      {/if}
    {/each}

    <!-- Axis labels -->
    <text
      x={width / 2}
      y={height - 6}
      text-anchor="middle"
      font-size="12"
      fill="#555"
    >
      Days (start → due)
    </text>

    <text
      x="14"
      y={height / 2}
      text-anchor="middle"
      font-size="12"
      fill="#555"
      transform={`rotate(-90 14 ${height / 2})`}
    >
      Subtasks remaining
    </text>

    <!-- x-ticks -->
    {#each xTicks as tick}
      <line
        x1={xForIndex(tick.i)}
        y1={height - padding}
        x2={xForIndex(tick.i)}
        y2={height - padding + 5}
        stroke="#999"
        stroke-width="1"
      />
      <text
        x={xForIndex(tick.i)}
        y={height - padding + 18}
        text-anchor="middle"
        font-size="10"
        fill="#555"
      >
        {tick.label}
      </text>
    {/each}
  </svg>

  <div class="summary">
    {#each summaries as s, i}
      <div class="summary-item" class:dim={!active[i]}>
        <div class="summary-title">
          <span
            class="dot"
            style={`background:${colors[i % colors.length]}`}
          ></span>
          {s.title}
        </div>
        <div class="summary-text">
          {s.completed} / {s.total} subtasks · {s.percent}% ·
          <strong>{s.status}</strong>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .burndown {
    max-width: 780px;
    margin: 1.5rem auto;
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e2e2;
    background: #fafafa;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .dates {
    margin: 0;
    font-size: 0.8rem;
    color: #555;
  }

  svg {
    width: 100%;
    display: block;
    margin-top: 0.5rem;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.25rem;
  }

  .legend button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    border: 1px solid #ddd;
    background: #fff;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .legend button.off {
    opacity: 0.4;
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 999px;
  }

  .summary {
    margin-top: 0.75rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .summary-item.dim {
    opacity: 0.4;
  }

  .summary-title {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 600;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
  }

  .summary-text {
    margin-top: 0.1rem;
  }
</style>
