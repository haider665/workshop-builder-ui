server {
    listen 80;
    listen [::]:80;

    server_name workshop.continental-motor.com;

    root /var/www/workshop.continental-motor.com;
    index index.html;

    client_max_body_size 50M;

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }
}
