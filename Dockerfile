FROM node:18-alpine

WORKDIR /app

# Install only production dependencies; adjust if you need dev deps in the container.
COPY package*.json ./
RUN npm install --production

COPY . .

ENV PORT=3000
EXPOSE 3000

# Expect a start script or equivalent entrypoint in package.json.
CMD ["npm", "start"]
