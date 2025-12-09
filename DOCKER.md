# Docker Setup Guide

This guide explains how to run auto_rfp using [Docker][].

## Build Image

   ```bash
   docker build -t auto-rfp .
   ```

## Run Container

   ```bash
   docker run --network host --env-file .env.local auto-rfp
   ```

[Docker]: https://docs.docker.com/get-docker/
