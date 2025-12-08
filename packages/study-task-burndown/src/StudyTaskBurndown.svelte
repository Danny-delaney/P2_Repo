<script>
  // PUBLIC PROPS
  export let startDate; // 'YYYY-MM-DD'
  // v0.3.0: tasks carry their own dueDate
  // task shape: { title, subtasksNum, subtasks: [{ completedDate }], dueDate }
  export let tasks = [];

  export let title = 'Multi-task study burndown';
  export let showLegend = true;
  export let showIdealLine = true;

  // Simple colour palette
  const colours = [
    '#2563eb', // blue
    '#16a34a', // green
    '#f97316', // orange
    '#ec4899', // pink
    '#a855f7', // purple
    '#facc15'  // yellow
  ];

  function parseISO(value) {
    const parts = value.split('-').map(Number);
    const y = parts[0];
    const m = (parts[1] || 1) - 1;
    const d = parts[2] || 1;
    return new Date(y, m, d);
  }

  function toISO(d) {
    return d.toISOString().slice(0, 10);
  }

  function shortLabel(d) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function clampDateRange(start, end) {
    const s = parseISO(start);
    const e = parseISO(end);
    if (e < s) return [toISO(e), toISO(s)];
    return [start, end];
  }

  function getDateRange(start, end) {
    const pair = clampDateRange(start, end);
    const sISO = pair[0];
    const eISO = pair[1];

    const startDateObj = parseISO(sISO);
    const endDateObj = parseISO(eISO);

    const range = [];
    const cursor = new Date(startDateObj);

    while (cursor <= endDateObj) {
      range.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return range;
  }

  function getTotalSubtasks(task) {
    if (typeof task.subtasksNum === 'number' && task.subtasksNum > 0) {
      return task.subtasksNum;
    }
    return Array.isArray(task.subtasks) ? task.subtasks.length : 0;
  }

  function countCompletedUpTo(task, day) {
    if (!Array.isArray(task.subtasks)) return 0;
    const dayISO = toISO(day);
    return task.subtasks.filter((s) => {
      if (!s || !s.completedDate) return false;
      return s.completedDate <= dayISO;
    }).length;
  }

  function isSameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  // v0.3.0: derive chart end date from the latest task dueDate
  function getChartEndFromTasks(startISO, taskList) {
    if (!taskList || !taskList.length) return startISO;
    let latest = parseISO(startISO);

    taskList.forEach((task) => {
      if (!task || !task.dueDate) return;
      const d = parseISO(task.dueDate);
      if (d > latest) latest = d;
    });

    return toISO(latest);
  }

  // v0.3.0: build a linear "ideal" series for a single task, going to 0 on its own dueDate
  function buildIdealForTask(task, range, total) {
    if (!range.length) return [];

    const due = parseISO(task.dueDate);
    const endIndex = range.findIndex((d) => isSameDay(d, due));

    // if due date isn't in range, keep flat
    if (endIndex === -1) {
      return new Array(range.length).fill(total);
    }

    const series = new Array(range.length).fill(total);

    if (endIndex <= 0) {
      series.fill(0);
      return series;
    }

    for (let i = 0; i <= endIndex; i++) {
      const t = i / endIndex; // 0 → 1
      series[i] = Math.max(0, total * (1 - t));
    }

    for (let i = endIndex + 1; i < range.length; i++) {
      series[i] = 0;
    }

    return series;
  }

  // -------- DERIVED STATE (Svelte reactivity) -----------------

  // Chart range from startDate + latest task.dueDate
  $: chartEndDate = getChartEndFromTasks(startDate, tasks);
  $: dateRange = getDateRange(startDate, chartEndDate);

  // For each task: remainingPerDay + idealPerDay
  $: taskSeries = (tasks || []).map((task) => {
    const total = getTotalSubtasks(task);
    const remainingPerDay = dateRange.map((day) => {
      const done = countCompletedUpTo(task, day);
      return Math.max(total - done, 0);
    });
    const idealPerDay = buildIdealForTask(task, dateRange, total);

    return { task, total, remainingPerDay, idealPerDay };
  });

  $: maxRemaining = (function () {
    const values = [];
    (taskSeries || []).forEach((s) => {
      values.push.apply(values, s.remainingPerDay);
    });
    const max = values.length ? Math.max.apply(null, values) : 0;
    return max || 1; // avoid divide by zero
  })();

  // Legend visibility
  let visibleFlags = (tasks || []).map(() => true);

  $: if (!visibleFlags || visibleFlags.length !== (tasks || []).length) {
    visibleFlags = (tasks || []).map(() => true);
  }

  function toggleTask(index) {
    visibleFlags = visibleFlags.map((flag, i) =>
      i === index ? !flag : flag
    );
  }

  // Helpers to map values to SVG coords
  function valueToY(value) {
    const marginTop = 10;
    const marginBottom = 20;
    const chartHeight = 100 - marginTop - marginBottom;

    const ratio = maxRemaining ? value / maxRemaining : 0;
    return marginTop + chartHeight * (1 - ratio);
  }

  function indexToX(index, total) {
    if (total <= 1) return 50;
    const marginLeft = 6;
    const marginRight = 5;
    const chartWidth = 100 - marginLeft - marginRight;

    return marginLeft + (chartWidth * index) / (total - 1);
  }

  function seriesToPolylinePoints(values) {
    return values
      .map((v, i) => `${indexToX(i, values.length)},${valueToY(v)}`)
      .join(' ');
  }

  // Axis tick density
  $: xTickEvery = dateRange.length > 10 ? 2 : 1;
</script>

<section class="burndown-wrapper">
  {#if title}
    <header class="header">
      <h2>{title}</h2>
      <p class="subtitle">
        Remaining subtasks over time for each study task (each task has its own deadline).
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

      <!-- Per-task ideal lines (dashed) -->
      {#if showIdealLine}
        {#each taskSeries as series, i}
          {#if visibleFlags[i]}
            <polyline
              class="ideal-line"
              style={`stroke: ${colours[i % colours.length]};`}
              points={seriesToPolylinePoints(series.idealPerDay)}
            />
          {/if}
        {/each}
      {/if}

      <!-- Actual remaining lines -->
      {#each taskSeries as series, i}
        {#if visibleFlags[i]}
          <polyline
            class="task-line"
            style={`stroke: ${colours[i % colours.length]};`}
            points={seriesToPolylinePoints(series.remainingPerDay)}
          />
        {/if}
      {/each}

      <!-- X-axis date labels -->
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
                ({series.total} subtasks, due {series.task.dueDate})
              </span>
            </span>
          </button>
        {/each}

        {#if showIdealLine}
          <div class="legend-extra">
            <span class="ideal-swatch" />
            <span class="label">Dashed line = ideal pace per task</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <footer class="footer">
    <p>Study burndown component v0.3.0 by @c00286125</p>
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

  .header .subtitle {
    margin: 0.15rem 0 0;
    font-size: 0.9rem;
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
    height: auto;
    max-height: 260px;
  }

  .axis {
    stroke: #9ca3af;
    stroke-width: 0.6;
  }

  .task-line {
    fill: none;
    stroke-width: 1.4;
  }

  .ideal-line {
    fill: none;
    stroke-width: 1;
    stroke-dasharray: 4 2;
  }

  .x-label,
  .y-label {
    font-size: 3px;
    fill: #4b5563;
  }

  .legend {
    margin-top: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .legend button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    background: transparent;
    padding: 0.15rem 0.4rem;
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.8rem;
    color: #374151;
    opacity: 0.6;
    transition: opacity 0.15s ease, background-color 0.15s ease;
  }

  .legend button.selected {
    opacity: 1;
    background-color: #f3f4f6;
  }

  .legend .swatch {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 999px;
  }

  .legend .label {
    display: inline-flex;
    align-items: baseline;
    gap: 0.25rem;
  }

  .legend .meta {
    font-size: 0.7rem;
    color: #6b7280;
  }

  .legend-extra {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-left: auto;
    font-size: 0.8rem;
    color: #4b5563;
  }

  .legend-extra .ideal-swatch {
    width: 1.2rem;
    height: 0;
    border-top: 1px dashed #6b7280;
  }

  .footer {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
    text-align: right;
  }
</style>
