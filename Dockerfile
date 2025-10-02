FROM node:22.19.0-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies globally including nodemon
RUN npm install -g nodemon
RUN yarn install

# Copy source code
COPY . .

# Change ownership for the working directory
RUN chown -R node:node /usr/src/app

# Switch to node user
USER node

# Expose port
EXPOSE 8000

# Start development server
CMD ["yarn", "dev"]