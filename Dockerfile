# --- STAGE 1: Build ---
FROM node:18-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm install

# Copia o código e gera o build do frontend (Vite)
COPY . .
RUN npm run build

# --- STAGE 2: Production ---
FROM node:18-alpine

WORKDIR /app

# Copia apenas o necessário do builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

# Exponha a porta configurada no env.js (padrão 3001)
EXPOSE 3001

# Variáveis de ambiente padrão
ENV NODE_ENV=production

# Comando para iniciar o servidor
CMD ["node", "src/server.js"]
