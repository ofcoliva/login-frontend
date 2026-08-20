# Documentação — login-frontend

## Documentos

| Documento | Descrição | Diagramas |
|---|---|---|
| [Autenticação](authentication.md) | Fluxo de login, sessão via cookie httpOnly, 4 mecanismos de expiração, tratamento de 401, logout, renovação de sessão | 6 Mermaid |
| [Arquitetura](architecture.md) | Visão geral do sistema, componentes de infraestrutura, stack | 1 Mermaid |
| [Deploy](deploy.md) | Docker Compose, blue-green, .env, comandos, modos de exposição (port-forward e Cloudflare Tunnel) | 4 Mermaid |

## Diagramas por tópico

### Autenticação

1. Visão geral dos componentes de auth
2. Fluxo de login (sequence)
3. Validação de sessão no startup (flowchart)
4. Os 4 mecanismos de expiração (graph com subgraphs)
5. Tratamento de 401 (sequence)
6. Logout (flowchart)

### Arquitetura

1. Diagrama de componentes — Traefik, slots blue/green, FastAPI, Cloudflare

### Deploy

1. Deploy blue-green (sequence)
2. Rollback (sequence)
3. Modo direto — port-forward (flowchart)
4. Modo tunnel — Cloudflare Tunnel (flowchart)
