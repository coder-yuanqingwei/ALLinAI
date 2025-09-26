<template>
  <div id="app">
    <header class="app-header">
      <h1>五子棋人机对抗游戏</h1>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
}

.app-main {
  flex: 1;
  padding: 2rem;
  min-height: calc(100vh - 80px);
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>