<script>
  export let data;
</script>

<div class="shell">
  <header>
    <span class="logo-dot"></span>
    <span class="title">Study Burndown Demo</span>
  </header>

  <main>
    <slot />
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f3f3ff;
    color: #222;
  }

  .shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid #e2e2e2;
    background: #ffffff;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .logo-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #3178c6;
  }

  .title {
    font-weight: 600;
    font-size: 0.95rem;
  }

  main {
    padding: 1.5rem;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
  }
</style>
