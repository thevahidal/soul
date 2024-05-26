FROM node:20

# Expose port for Soul server
EXPOSE 8000

COPY package.json package-lock.json ./

RUN npm install

RUN npm install -g soul-cli

# Set the database file path as an environment variable
ENV DB_FILE=/data/foobar.db

VOLUME /data

CMD ["sh", "-c", "soul -d $DB_FILE -p 8000"]

