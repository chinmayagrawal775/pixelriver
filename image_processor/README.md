# Image processing service

This service is the part of pixerriver application.
This service runs the workers for conuming the image processing tasks

For detailed scope of service: please refer the readme file in the root of repository

# Webhooks processing service

This service also handles the firing of webhooks in redis pub/sub queue.
After the successful processing the CSV images, it publish the msg in redis if webhook url is present
then resis subscriber will fire that webhook.

> Always ensure to run the webhook service before running the image processing service.

## Dependecies

- kafka-python - for kafka client
- redis - official redis client
- google-cloud-storage - for GCP Cloud interaction
- pymongo - official mongodb driver
- pillow - for image processing

For further references on how to interact with the service APIs, you can refer

- **Desing Diagram:** [here](https://github.com/chinmayagrawal775/pixelriver/blob/main/pixelriver/system-design.svg)
- **Technical Design Docs:** [here](https://github.com/chinmayagrawal775/pixelriver/blob/main/pixelriver/technical-design-document.md)
- **Public API Docs:** [here](https://documenter.getpostman.com/view/33976849/2sAYkDMLLw)
