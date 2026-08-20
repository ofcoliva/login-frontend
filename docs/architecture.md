# Arquitetura do Sistema

Visão geral da infraestrutura e fluxo de dados do login-frontend.

## Visão geral

A aplicação é um SPA Vue 3 servido por nginx (container não-root, read-only) em **dois slots blue/green**, atrás do **traefik** (TLS + ACME DNS-01 via Cloudflare, com switch de tráfego por weights sem downtime). O frontend e o backend **FastAPI** compartilham o mesmo origin público (`/api/v1`), então o cookie httpOnly flui sem CORS. A máquina tem duas maneiras de expor o serviço: **modo direto** (port-forward no roteador) ou **Cloudflare Tunnel** (conexão de saída do `cloudflared`, sem abrir portas).

Para detalhes de deploy, veja [Deploy (Docker / HTTPS)](deploy.md). Para detalhes de autenticação, veja [Autenticação](authentication.md).

## Diagrama de componentes

```mermaid
flowchart TB
    U([Usuário / Browser<br/>Vue 3 SPA])

    subgraph CF["Cloudflare"]
        DNS["DNS — registro A (direto)<br/>ou CNAME do túnel"]
        EDGE["Edge"]
    end

    LE["Let's Encrypt<br/>ACME DNS-01 via CF_DNS_API_TOKEN"]

    subgraph HOST["Máquina (Docker Compose)"]
        direction TB
        subgraph INGRESS["Ingress — rede edge"]
            TRAEFIK["Traefik v3<br/>web (:80) + websecure (:443)<br/>ACME DNS-01 · file provider (rotas + WRR)<br/>weights blue/green em deploy/traefik/dynamic"]
            CFT["cloudflared — túnel de saída<br/>(só no modo --tunnel)"]
        end
        subgraph APP["Aplicação — rede edge (slots blue/green)"]
            B["frontend-blue — nginx non-root · read-only (dist/)"]
            G["frontend-green — nginx non-root · read-only (dist/)"]
        end
        OPS["autoheal · watchtower"]
    end

    API["FastAPI — backend /api/v1 · cookie httpOnly<br/>(mesmo origin público)"]

    U -->|"direto: https://DOMAIN:PORT"| TRAEFIK
    U -->|"tunnel: https://DOMAIN"| EDGE
    EDGE -->|CNAME do túnel| CFT
    CFT -->|"https://traefik:443"| TRAEFIK
    TRAEFIK -->|"WRR 100/0 (switch de weights = cutover/rollback)"| B
    TRAEFIK -->|"WRR 100/0 (switch de weights = cutover/rollback)"| G
    TRAEFIK -->|DNS-01| LE
    B & G -->|"/api/v1 (mesmo origin)"| API
```

## Stack de infraestrutura

| Camada | Componente | Função |
|---|---|---|
| DNS | Cloudflare | Registro A (direto) ou CNAME (túnel) |
| TLS | Let's Encrypt + ACME DNS-01 | Certificado automático via API Cloudflare |
| Ingress | Traefik v3 | Proxy reverso, TLS termination, WRR blue/green |
| Tunnel | cloudflared | Túnel de saída (modo tunnel, sem port-forward) |
| Frontend | nginx (non-root, read-only) | Serve o SPA estático (dist/) |
| Backend | FastAPI | API /api/v1, gerencia cookie HttpOnly |
| Ops | autoheal + watchtower | Healthcheck e auto-update de infra |
