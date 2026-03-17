FROM alpine:latest

RUN apk upgrade \
    && apk add nodejs npm 

WORKDIR /dashboard

CMD ["node", "backend.js"]
