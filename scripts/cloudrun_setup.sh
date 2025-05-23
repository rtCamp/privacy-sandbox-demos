#!/usr/bin/env zsh

# Copyright 2022 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# evaluate .env file
source .env.deploy

# setup Google Cloud SDK project
gcloud config set project $GCP_PROJECT_NAME
gcloud config get-value project

# Enable Cloud Run API
gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com cloudfunctions.googleapis.com logging.googleapis.com pubsub.googleapis.com run.googleapis.com

# make the default region us-central1
gcloud config set run/region us-central1
