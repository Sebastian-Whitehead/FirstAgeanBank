FROM node:22-alpine AS frontend-build

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend ./frontend
RUN npm run build

FROM php:8.4-apache

RUN docker-php-ext-install mysqli && a2enmod rewrite

COPY . /var/www/html/
COPY --from=frontend-build /build/assets/react/ /var/www/html/assets/react/
COPY --from=frontend-build /build/assets/react/index.html /var/www/html/index.html
COPY docker/apache-react.conf /etc/apache2/conf-available/apache-react.conf
RUN a2enconf apache-react

RUN chown -R www-data:www-data /var/www/html/assets/users
