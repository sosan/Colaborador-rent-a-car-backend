# syntax = docker/dockerfile:1.2
FROM docker.io/bitnami/nginx:latest

# USER 0
# RUN --mount=type=secret,id=SERVER_KEY_SSL,target=/run/secrets/SERVER_KEY_SSL cp /run/secrets/SERVER_KEY_SSL /certs/server_nginx.key
# RUN --mount=type=secret,id=SERVER_CRT_SSL,target=/run/secrets/SERVER_CRT_SSL cp /run/secrets/SERVER_CRT_SSL /certs/server_nginx.crt
# RUN --mount=type=secret,id=SERVER_LOCAL_KEY_SSL,target=/run/secrets/SERVER_LOCAL_KEY_SSL cp /run/secrets/SERVER_LOCAL_KEY_SSL /certs/server_local.key
# RUN --mount=type=secret,id=SERVER_LOCAL_CRT_SSL,target=/run/secrets/SERVER_LOCAL_CRT_SSL cp /run/secrets/SERVER_LOCAL_CRT_SSL /certs/server_local.crt

USER 1001

# EXPOSE 8080 8443
ARG EMAIL_CERTIFICATION=info@domain.com
ARG DOMAIN_1
ARG DOMAIN_2
COPY ./nginx.conf /opt/bitnami/nginx/conf/server_blocks/nginx.conf

# VOLUME /certs
COPY ./lego /usr/local/bin

CMD [ "sh", "-c", "sleep 6h" ]
# CMD [ "sh", "-c", "nginx -g 'daemon off;'" ]


# WORKDIR /app
# ENTRYPOINT [ "/opt/bitnami/scripts/nginx/entrypoint.sh" ]
# CMD [ "/opt/bitnami/scripts/nginx/run.sh" ]


# USER 0
# RUN chown root:root /opt/bitnami/nginx/conf/server*
# RUN chmod 600 /opt/bitnami/nginx/conf/server*

# https://github.com/wmnnd/nginx-certbot/blob/master/docker-compose.yml


# RUN lego \
#     --server=https://acme-staging-v02.api.letsencrypt.org/directory \
#     --email="${EMAIL_CERTIFICATION}" \
#     --domains=${DOMAIN_1} \
#     --domains=${DOMAIN_2} \
#     --path="/certs/" \
#     --http \
#     renew --days 30 \
#     --http.port 81 \
#     --http.webroot "/certs/" \
#     --accept-tos \
#     run



# RUN echo "PATH=$PATH" > /etc/cron.d/renewcerts  \
#     && echo "@weekly certbot renew --nginx >> /var/log/cron.log 2>&1" >>/etc/cron.d/renewcerts

# /certs/accounts/acme-v02.api.letsencrypt.org/servicios@rentcarmallorca.es/keys/servicios@rentcarmallorca.es.key
# /certs/accounts/acme-v02.api.letsencrypt.org/${CERTBOT_EMAIL}/keys/${CERTBOT_EMAIL}.key

# RUN ln -s /etc/lego/certificates/DOMAIN.key /certs/server.key \
#     && ln -s /etc/lego/certificates/DOMAIN.crt /certs/server.crt


# CMD [ "/bin/sh", "-c", "while :; do sleep 6h & wait $${!}; nginx -s reload; done & nginx -g 'daemon off;'" ]

#  "/bin/sh -c 'while :; do sleep 6h & wait $${!}; nginx -s reload; done & nginx -g \"daemon off;\"'"

# CMD [ "sh", "-c", "cron && nginx -g 'daemon off;'" ]

# RUN crontab -u 1001 -e /etc/cron.d/certbot-renew

# RUN install_packages cron certbot python-certbot-nginx bash wget \
#     && certbot certonly --standalone --agree-tos -m "${CERTBOT_EMAIL}" -n -d ${DOMAIN_LIST} \
#     && echo "PATH=$PATH" > /etc/cron.d/certbot-renew  \
#     && echo "@monthly certbot renew --nginx >> /var/log/cron.log 2>&1" >>/etc/cron.d/certbot-renew


# RUN apt-get update \
#     && apt-get install -y cron certbot python-certbot-nginx bash wget \
#     && certbot certonly --standalone --agree-tos -m "${CERTBOT_EMAIL}" -n -d ${DOMAIN_LIST} \
#     # && rm -rf /var/lib/apt/lists/* \
#     && echo "PATH=$PATH" > /etc/cron.d/certbot-renew  \
#     && echo "@monthly certbot renew --nginx >> /var/log/cron.log 2>&1" >>/etc/cron.d/certbot-renew
