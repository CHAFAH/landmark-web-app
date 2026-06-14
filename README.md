# Landmark Technologies

A full-stack web application for Landmark Technologies — an online DevOps and AI training platform.

![Landmark Technologies](public/logo.png)

## Tech Stack

- **Frontend:** React 18, React Router
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Containerization:** Docker, Docker Compose
- **Orchestration:** Kubernetes (EKS)
- **CI/CD:** GitHub Actions, Jenkins, CircleCI

---

## Table of Contents

1. [Local Development](#local-development)
2. [Running Tests](#running-tests)
3. [Docker Compose](#docker-compose)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Kubernetes Deployment](#kubernetes-deployment)

---

## Local Development

### Prerequisites

- Node.js 18+
- MongoDB running locally (or use Docker)

### Install & Run

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Start MongoDB (if not using Docker)
brew services start mongodb-community

# Start the backend (terminal 1)
cd server
MONGO_URI=mongodb://localhost:27017/landmark npm start

# Start the frontend (terminal 2)
npm start
```

### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## Running Tests

```bash
# Frontend tests (runs and exits)
npm test

# Server tests (uses in-memory MongoDB)
cd server && npm test
```

---

## Docker Compose

Runs both the app and MongoDB in containers.

```bash
# Build and start
docker-compose up -d --build

# Access the app
open http://localhost:8080

# View logs
docker-compose logs -f app

# Check registered students in DB
curl http://localhost:8080/api/students

# Stop
docker-compose down
```

> **Note:** Port 8080 maps to the app's internal port 5000. If port 5000 is free on your machine, you can change it back in `docker-compose.yml`.

---

## CI/CD Pipeline

### Branching Strategy

| Branch | CI (test + build) | Deploy | K8s Namespace |
|--------|-------------------|--------|---------------|
| Any branch | ✅ | ❌ | — |
| `develop` | ✅ | ✅ | `develop` |
| `release` / `release/*` | ✅ | ✅ | `staging` |
| `main` / `hotfix` / `hotfix/*` | ✅ | ✅ | `production` |

### Docker Image

- **Repository:** `chafah/landmark-web-app`
- **Tag format:** `<branch>-<YYYYMMDD>-<HHMMSS>`
- **Examples:**
  - `chafah/landmark-web-app:develop-20260604-092500`
  - `chafah/landmark-web-app:release-v1.0-20260604-093000`
  - `chafah/landmark-web-app:main-20260604-100000`

---

### GitHub Actions Setup

Workflow files are in `.github/workflows/`:
- `ci.yml` — runs on all branches (test + build only)
- `deploy-dev.yml` — deploys on `develop`
- `deploy-stg.yml` — deploys on `release*`
- `deploy-prod.yml` — deploys on `main` / `hotfix*`

#### Required Secrets

Go to **GitHub Repo → Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key with ECR + EKS permissions |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |

#### Required Environments

Go to **GitHub Repo → Settings → Environments** and create:

- `dev`
- `staging`
- `production` (optionally add required reviewers for manual approval)

---

### Jenkins Setup

The `Jenkinsfile` is at the project root.

#### Prerequisites

- Jenkins with **Pipeline** and **Multibranch Pipeline** plugins
- Docker installed on Jenkins agent
- AWS CLI and `kubectl` installed on Jenkins agent

#### Required Credentials

Go to **Jenkins → Manage Jenkins → Manage Credentials** and add:

| Credential ID | Type | Description |
|---------------|------|-------------|
| `ecr-registry` | Secret text | Your ECR registry URL (e.g. `123456789.dkr.ecr.us-east-1.amazonaws.com`) |
| AWS credentials | AWS Credentials | Access key + secret key with ECR/EKS permissions |

#### Setup Steps

1. Create a **Multibranch Pipeline** job in Jenkins
2. Point it to your Git repository
3. Jenkins will auto-discover branches and run the appropriate stages
4. Only `develop`, `release*`, `main`, `hotfix*` branches will trigger deployments

---

### CircleCI Setup

Config file is at `.circleci/config.yml`.

#### Required Environment Variables

Go to **CircleCI → Project Settings → Environment Variables** and add:

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `ECR_REGISTRY` | Your ECR registry URL (e.g. `123456789.dkr.ecr.us-east-1.amazonaws.com`) |

#### Setup Steps

1. Connect your GitHub repo to CircleCI
2. Add the environment variables above
3. CircleCI will auto-detect `.circleci/config.yml` and run workflows based on branch filters

---

## Kubernetes Deployment

### Cluster Info

- **Cluster:** `landmark-eks`
- **Region:** `us-east-1`
- **All environments share one cluster**, separated by namespaces

### K8s Manifests

All manifests are in the `k8s/` directory:

| File | Description |
|------|-------------|
| `namespace.yml` | Namespace definition |
| `app-deployment.yml` | App deployment + ClusterIP service |
| `mongo-deployment.yml` | MongoDB deployment + headless service |
| `mongo-pvc.yml` | Persistent volume claim for MongoDB |
| `mongo-secret.yml` | MongoDB credentials (base64 encoded) |
| `configmap.yml` | App configuration |
| `ingress.yml` | LoadBalancer service (AWS NLB) |
| `hpa.yml` | Horizontal Pod Autoscaler |
| `network-policy.yml` | Network policy (only app can reach MongoDB) |

### Update the LoadBalancer Service

Edit `k8s/ingress.yml` and replace the subnet placeholders with your actual public subnet IDs:

```yaml
annotations:
  service.beta.kubernetes.io/aws-load-balancer-subnets: "subnet-xxxxxx, subnet-yyyyyy, subnet-zzzzzz"
```

To find your public subnets:

```bash
aws ec2 describe-subnets --filters "Name=vpc-id,Values=<your-vpc-id>" --query 'Subnets[?MapPublicIpOnLaunch==`true`].SubnetId' --output text
```

### Update MongoDB Secret

Edit `k8s/mongo-secret.yml` with your own base64-encoded credentials:

```bash
echo -n 'your-username' | base64
echo -n 'your-password' | base64
```

### Manual Deployment

```bash
# Connect to cluster
aws eks update-kubeconfig --name landmark-eks --region us-east-1

# Deploy to a specific namespace (e.g. develop)
sed -i 's/namespace: landmark/namespace: develop/g' k8s/*.yml
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n develop
kubectl get svc -n develop

# Get LoadBalancer URL
kubectl get svc landmark-app-lb -n develop -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### Access the App

After deployment, get the LoadBalancer DNS:

```bash
kubectl get svc landmark-app-lb -n <namespace>
```

The `EXTERNAL-IP` column will show the AWS NLB DNS name. Open it in your browser on port 80.

---

## Project Structure

```
landmark-technologies/
├── .circleci/config.yml          # CircleCI pipeline
├── .github/workflows/            # GitHub Actions pipelines
│   ├── ci.yml
│   ├── deploy-dev.yml
│   ├── deploy-stg.yml
│   └── deploy-prod.yml
├── k8s/                          # Kubernetes manifests
├── public/                       # Static assets
├── server/                       # Express backend
│   ├── __tests__/
│   ├── index.js
│   └── package.json
├── src/                          # React frontend
│   ├── __tests__/
│   ├── pages/
│   ├── App.js
│   └── App.css
├── docker-compose.yml
├── Dockerfile
├── Jenkinsfile
└── package.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/signup` | Register a new student |
| `GET` | `/api/students` | List all registered students |

---

## License

© 2024 Landmark Technologies. All rights reserved.
#   R e l e a s e   b r a n c h   u p d a t e      
 