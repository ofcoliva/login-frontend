<script setup lang="ts">
import {
  isLogin,
  handleSubmit,
  form,
  errorMessage,
  isLoading,
  toggleAuth,
} from '@/stores/loginStore'
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="logo">
        <img src="https://avatars.githubusercontent.com/u/108588087?v=4" alt="logo" />
        <h2>{{ isLogin ? 'Bem-vindo de volta' : 'Crie sua conta' }}</h2>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <TransitionGroup name="staggered">
          <!-- USUÁRIO -->
          <div class="input-group" key="username">
            <label>Usuário</label>
            <input v-model="form.username" type="text" placeholder="Seu usuário" required />
          </div>

          <!-- EMAIL (Cadastro) -->
          <div v-if="!isLogin" class="input-group" key="email">
            <label>E-mail</label>
            <input v-model="form.email" type="email" placeholder="exemplo@email.com" required />
          </div>

          <!-- SENHA -->
          <div class="input-group" key="password">
            <label>Senha</label>
            <input v-model="form.password" type="password" placeholder="••••••••" required />
          </div>

          <!-- EXTRAS (Cadastro) -->
          <div v-if="!isLogin" class="extra-fields" key="extras">
            <div class="input-group">
              <label>Confirmar Senha</label>
              <input
                v-model="form.confirmPassword"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            <div class="checkbox-group">
              <div class="custom-checkbox">
                <input v-model="form.agreeTerms" type="checkbox" id="terms" required />
                <span class="checkmark"></span>
              </div>
              <label for="terms">Eu concordo com os termos</label>
            </div>
          </div>
        </TransitionGroup>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Processando...' : isLogin ? 'Entrar' : 'Registrar' }}
        </button>
      </form>

      <p class="toggle-text">
        {{ isLogin ? 'Não tem uma conta?' : 'Já possui conta?' }}
        <span @click="toggleAuth">{{ isLogin ? 'Cadastre-se' : 'Faça Login' }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped src="../assets/login_style.css"></style>
