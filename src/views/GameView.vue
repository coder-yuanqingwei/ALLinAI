<template>
  <div class="game-view">
    <GameBoard />
  </div>
</template>

<script setup lang="ts">
import GameBoard from '@/components/GameBoard.vue'
</script>

<style scoped>
.game-view {
  width: 100%;
  min-height: 100vh;
}
</style>