# Continental Works / Frappe nginx reverse proxy
# Public domain: continental-motor.com
# Backend Frappe site: cw.dotech.biz

upstream continental_motor_backend {
    server 192.168.254.246:8000 fail_timeout=0;
}

upstream continental_motor_socketio {
    server 192.168.254.246:9000 fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;
    server_name continental-motor.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;

    server_name continental-motor.com;

    ssl_certificate /etc/letsencrypt/live/continental-motor.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/continental-motor.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "same-origin, strict-origin-when-cross-origin" always;

    location /socket.io {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Frappe-Site-Name cw.dotech.biz;
        proxy_set_header Origin $scheme://$http_host;
        proxy_set_header Host $host;

        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_buffering off;
        proxy_cache off;

        proxy_pass http://continental_motor_socketio;
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Frappe-Site-Name cw.dotech.biz;
        proxy_set_header Host $host;
        proxy_set_header X-Use-X-Accel-Redirect True;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        proxy_redirect off;

        proxy_pass http://continental_motor_backend;
    }

    sendfile on;
    keepalive_timeout 15;
    client_max_body_size 100m;
    client_body_buffer_size 16K;
    client_header_buffer_size 1k;

    gzip on;
    gzip_http_version 1.1;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/rss+xml
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/font-woff
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/svg+xml
        image/x-icon
        text/css
        text/plain
        text/x-component;
}
