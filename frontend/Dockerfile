# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Kopiramo package.json i package-lock.json
COPY package*.json ./

# Instaliramo zavisnosti
RUN npm install

# Kopiramo sav Angular kod (src + angular.json)
COPY . .

# Build Angular aplikacije
RUN npm run build -- --configuration production

# --- Production stage ---
FROM nginx:alpine

# Kopiramo nginx konfiguraciju
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Kopiramo build iz dist/frontend
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]