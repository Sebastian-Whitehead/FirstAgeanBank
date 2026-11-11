FROM node:22-alpine AS frontend-build

WORKDIR /build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend ./frontend
RUN npm run build

FROM php:8.4-apache

RUN a2enmod rewrite

COPY . /var/www/html/
COPY --from=frontend-build /build/assets/react/ /var/www/html/assets/react/
COPY --from=frontend-build /build/assets/react/index.html /var/www/html/index.html
COPY docker/apache-react.conf /etc/apache2/conf-available/apache-react.conf
RUN a2enconf apache-react
