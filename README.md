# PixelRiver - Immerse in the river of pixels

![Pixelriver](https://img.shields.io/badge/pixelriver-blue)
![Made with love in India](https://madewithlove.now.sh/in?heart=true&colorA=%232543d4&colorB=%23f58f00&template=for-the-badge)
[![made-with-python](https://img.shields.io/badge/Made%20with-Python-1f425f.svg)](https://www.python.org/)
[![made-with-typescript](https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square)](https://www.typescriptlang.org/)
[![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)

PixelRiver is a file upload and processing system designed to handle file uploads and process images. Primary objective of the system is to do the compression of images whoose URLs are provided in the CSV.

> This service takes the file, return the uploadID, process the csvfile immages compression & fire the webhook after completion. It also offers the process status check API.

## System Design Diagram

<img src="https://github.com/chinmayagrawal775/pixelriver/blob/main/pixelriver/system-design.svg?raw=true" alt="system-design-diagram"></img>

## Technical Design Docs

Please refer the detailed [technical design docs here.](https://github.com/chinmayagrawal775/pixelriver/blob/main/pixelriver/technical-design-document.md)

## Tech Stack Used

- **NodeJs:** For API service
- **Python:** For Worker service
- **MongoDB:** NoSQL, transactional based DB for Storing Upload Metadata
- **Kafka:** For Messaging queue for worker service
- **Redis:** For Caching, Rate-limiting, & Pub/Sub(for webhook firing)
- **GCP:** For File Uploads
- **Nginx:** Load Balacing & Reverse Proxy

## System Overview & Core Components & Infra Services

The system consists of the following key components: Each component is explained seperatly.

- **API Server (Node.js + TypeScript) -** Handles file uploads, status checks, and API requests.
- **Ngnix (LB & Reverse Proxy) -** Used as the Load Balancer for API service.
- **Rate Limiting -** For status check API. Uses Fixed window technique, implemented via redis.
- **Storage Bucket (GCP) -** Stores uploaded files.
- **Database (MongoDB) -** Persists metadata and processed results.
- **Caching Layer (Redis) -** For frequent status checks & preventing DB calls. Also used for rate limiting.
- **Message Queue (Kafka) -** Ensures reliable communication between services.
- **Image Processing Service (Python based processors) -** Process images asynchronously.
- **Webhook Dispatcher(Redis Pub/Sub) -** Notifies the user when processing is complete.
- **Logging & Monitoring (Winston) -** Various services generate logs. These logs are collected in the log/ directory of service. Can be later used for monitoring purpose.

For Detailed Explaination of each comonent please refer the [technical design docs](https://github.com/chinmayagrawal775/pixelriver/blob/main/pixelriver/technical-design-document.md)

## API Documentations

#### Public API Documentations

- You can find the public API Documentation [here](https://documenter.getpostman.com/view/33976849/2sAYkDMLLw)
- These are working Documentaion which you can import into the postman to test varoius APIs like this:
  ![Public API Docs - Postman](https://github.com/user-attachments/assets/6a1ef0e8-3266-4182-8159-d768f5053c24)

#### Internal API Documentations

- Project also provides the internal API documentation for developers. To access them, start your local development server.
- These are internal docs meant for developers only, so they don't work on production.
- Then you can access the documentation by going to `/api-docs-internal` route. It will serve you the docs. And will looks like this.
  ![Internal Developer API Docs](https://github.com/user-attachments/assets/8b7d60a0-c61b-40f0-b85f-c645fb67cb43)

## Repository Structure

Repo follows the monolithic structure.
Here is the overview. Please refer the README file of each module for more info

```
./
 ├── api # This is the API Service which provides upload API.
 │   ├── docs/ # This conatins the internal developer API docs
 │   ├── README.md
 │   ├── src # Here the actual code lies.
 │   │   ├── app.ts # main service file
 │   │   ├── http # all http related stuff
 │   │   │   ├── controllers
 │   │   │   ├── middlewares
 │   │   │   ├── routes
 │   │   │   └── server.ts # boots up http server
 │   │   ├── infra # handles all infra services like redis, kafak, etc
 │   │   ├── models # contains the DB models
 │   │   └── services # contains the actual business logic
 │   │
 ├── image-processor # This is the Consumer Service which provides process the uploaded files.
 │   └── README.md
 │   │
 ├── pixelriver # This directory contains the project documentation & methodology
 └── README.md
```

## Local Dev Setup

#### System Requirements

- Node.js
- NPM
- Python
- Kafka with zookeeper
- Redis
- GCP Storage Bucket
- MongoDB
- Nginx(not required for local env)

#### 1. Repo setup

```
git clone git@github.com:chinmayagrawal775/pixelriver.git
cd pixelriver
```

Ensure you kafka broker is running. Please refer the [Kafka Quickstart Guid](https://kafka.apache.org/quickstart)
Following are the few useful commands:

```
# Run zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties

# Run kafka server
bin/kafka-server-start.sh config/server.properties

# consume messages (for testing only)
bin/kafka-console-consumer.sh --topic pixelriver-new-upload --from-beginning --bootstrap-server localhost:9092
```

Then make sure to create this topic in your kafka

```
# create kafka topic
bin/kafka-topics.sh --create --topic pixelriver-new-upload --bootstrap-server localhost:9092
```

> Note: You can also run the server without kafka by adding `DISABLE_KAFKA="true"` to the `.env` file for quick server launch

> For GCP Setup: If you do not have valid GCP Creds then you can spin up thi fake GCP server: https://github.com/fsouza/fake-gcs-server This will work fine.

#### 2. API Service setup

```
cd api
```

make `.env` from `.env.example`. Then:

```
npm install
npm run dev
```

#### 3. Consumer Service setup

To be added...

## Further Reference & Link

- **Desing Diagram:** [here](https://github.com/chinmayagrawal775/pixelriver/blob/main/pixelriver/system-design.svg)
- **Technical Design Docs:** [here](https://github.com/chinmayagrawal775/pixelriver/blob/main/pixelriver/technical-design-document.md)
- **Public API Docs:** [here](https://documenter.getpostman.com/view/33976849/2sAYkDMLLw)
