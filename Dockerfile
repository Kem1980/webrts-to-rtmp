FROM ubuntu:20.04

WORKDIR /src/

RUN apt update && apt install -y ffmpeg curl
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt install -y nodejs

EXPOSE 443
EXPOSE 1935
EXPOSE 8033

CMD [ "node", "/src/server.js" ]