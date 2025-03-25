# PixelRiver

## **1. Overview**

PixelRiver is a file upload and processing system designed to handle file uploads and process images. Primary objective of the system is to do the compression of images whoose URLs are provided in the CSV.

**System Design Diagram**
<img src="https://github.com/chinmayagrawal775/pixelriver/blob/main/pixelriver/system-design.svg?raw=true" alt="system-design-diagram"></img>

## **2. Requirements**

- Accept a csv in below format:

```
Serial Number,Product Name,Input Image Urls
1.,SKU1,"https://www.public-image-url1.jpg,https://www.public-image-url2.jpg,https://www.public-image-url3.jpg"
2.,SKU2,"https://www.public-image-url1.jpg,https://www.public-image-url2.jpg,https://www.public-image-url3.jpg"
```

- Validate the CSV is in correct structure.
- Return the unique uploadID
- Process the file, compress the images to 50% asynchronously.
- Also make the API to check the processing status using the uploadID.
- Also fire the webhook once the processing is complete.
- Output file will be looked like this.

```
Serial Number,Product Name,Input Image Urls,Output Image Urls
1.,SKU1,"https://www.public-image-url1.jpg,https://www.public-image-url2.jpg,https://www.public-image-url3.jpg","https://www.public-image-url1-output.jpg,https://www.public-image-url2-output.jpg,https://www.public-image-url3-output.jpg"
2.,SKU2,"https://www.public-image-url1.jpg,https://www.public-image-url2.jpg,https://www.public-image-url3.jpg","https://www.public-image-url1-output.jpg,https://www.public-image-url2-output.jpg,https://www.public-image-url3-output.jpg"
```

## **3. Tech Stack Used**

- **NodeJs:** For API service
- **Python:** For Worker service
- **MongoDB:** NoSQL, transactional based DB for Storing Upload Metadata
- **Kafka:** For Messaging queue for worker service
- **Redis:** For Caching, Rate-limiting, & Pub/Sub(for webhook firing)
- **GCP:** For File Uploads
- **Nginx:** Load Balacing & Reverse Proxy

## **4. System Overview & Core Components & Infra Services**

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

## **5. Detailed Components Breakdown**

### **5.1 API Server (Node.js + TypeScript):**

Core APIs of the Pixelriver is build using the nodejs and typescript. This services uses the express.js framework to expose the two primarily used endpoints:

**Upload File Endpoint: POST /api/v1/uploads**

- This endpoint expectes the CSV file, and validates its structure first. **Max File Size: 5MB (can be configured)**
- After validations, it stores the upoaded file in the cloud storage(GCP in our case), and delete the locally saved file.
- Then it save the upload details in the Database(MongoDB). It primarily stores the metadata of the uploads, like uploadtime, upload status.This endpoints
- Then it generates the uniques uploadID, which will be later used to track the status of upload by the user & our system.
- Then it push the CSV processing task to kafka queue. Which will be picked by one of the available workers.
- Then is sets the initial status of upload(queued) in redis. This status in redis will be later used by the upload-status-check API to get the status & progress of the upload.
- At end it return the generated upload ID as the response to the user. Later this ID can be used for status check.

**Upload Status Check Endpoint: POST /api/v1/uploads/status**

- This endpoint is used to check the status of the processing.
- This return the status & the progress percentage of the upload. If the upload is completed then it aslo returns the ULR for downloading the processed file.
- This enpoint has rate limiting enabled with **max 5req/minute**
- This fetch the status & progress percentage from the redis.
- If the key not found then it can means:
  - UploadID is invalid
  - Upload is completed(completed uploads are removed from redis)
  - Something unexpected happend in system.

### **5.2 Ngnix (LB & Reverse Proxy):**

Nignx will work as the load balancer & reverse proxy for the API.

Few configurations for reverse proxy:

- Max upload limit for file
- Caching response
- Rate limiting
  These configurations are already done at API Service level. Better to have them at LB level also.

### **5.3 Storage Bucket (GCP):**

- CSV files which are uploaded by the user, are first loded locally in the system. After that they are uploaded to the GCP bucket.
- After succcessful upload the locally saved files is deleted to prevent space exaution.

### **5.4 Database (MongoDB):**

- As we need to store the metadata to track the user uploads, and the data will have loose-schema, that's why mongoDB has been choosen.
- MongoDB provides the schema flexibility, so adding new keys to the metadata is always easy.
- It stores the data like, filename, status, progress percentage, upload date, etc

### **5.5 Caching Layer (Redis):**

- Caching is primarily used for status checks by user. Redis holds the status for the file uploads done by user.
- Processing workers regularly update the **percentage of processing completed** in redis with the status
- When user checks the status for processing, we return the status and progress percentage to user from redis itself.
- **Cache is missed only in below cases:**
  - UploadID is invalid
  - Upload is completed(completed uploads are removed from redis)
  - Something unexpected happend in system.

### **5.6 Rate Limiting:**

- In the process status check endpoint, rate limiting of **5req/sec** is there.
- This rate-limiting is powered by redis, implemented on per uploadID.
- Rate-limiting uses the **fixed window** technique.

### **5.7 Message Queue (Kafka):**

- Kafka is used as the messaging queue in the system.
- When the user uploads the files, the task is pushed in the queue for further processing.
- **Reason for selecting Kafka:**
  - Message durability: Even if system crashes, it persists the message.
  - Scalability: Even in the case of sudden surge in request, it can handle the load efficienlty.

### **5.8 Image Processing Service (Python based processors):**

- These are the actual worker/consumers who are responsible for processing of the files.
- Service is written in python.
- Consumes the message from the kafa queue.
- Do the image processing (this step is done in parallel via multi-threading. No. of worker decided at runtime)
  - Download the image
  - Process the image
  - Upload the processed image to gcs
- Regularly update the status & progress percentage in redis.
- **When the processing is completed it will:**
  - Update the status & progress percentage in DB.
  - Remove the key from redis.
  - Publish message if Redis Pub/Sub for webhooks firing(if any).

### **5.9 Webhook Dispatcher(Redis Pub/Sub):**

- Webhooks are the user configured URLs, on which we need to send the notifications once the upload is completed.
- This uses the Pub/Sub model, with **only one subscriber.**
- This fires the webhook, and then save the webhook response in the DB.
- Saving response indicates, the notification was sent to the client.
- **Reason for choosing Redis Pub/Sub over kafka:**
  - **Simpler architecture** with low configurations required.
  - **Low latency**, ensures the quick notification delivery.
  - **Low Cost**, as there is message retention and less bandwidth required.

### **5.10 Logging & Monitoring (Winston):**

- Each service generates its own logs in the `logs/` directory.
- These can be further used by grafana & loki to analyse system state.
- This is helpful in monitoring

## 6. Future Developments Scope

In future service can be extesible with:

- Providing the user authentication
- Saving the product data(which is in CSV) in DB
- Implement Long Polling in Status-check API
- Implement DLQ for failed processing.
- Providing the internal analytics dashboards.
