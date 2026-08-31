# Jenkins Guide — Landmark Web App

---

## 1. What is Jenkins?

Jenkins is a free, open-source automation server. It automates repetitive tasks in your software delivery process — cloning code, running tests, building Docker images, and pushing them to a registry — so you don't have to do it manually every time.

**Key facts:**
- Written in Java
- Over 1,800 plugins
- Self-hosted — runs on your own server
- Free and open-source

---

## 2. Install Docker & Jenkins on Amazon Linux

### Launch an EC2 Instance

| Setting | Value |
|---------|-------|
| AMI | Amazon Linux 2023 |
| Instance type | t3.medium |
| Storage | 30 GB gp3 |
| Security Group | TCP 22 (SSH), TCP 8080 (Jenkins) |

SSH in:
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ec2-user@<public-ip>
```

### Update the system
```bash
sudo dnf update -y
```

### Install Java 21
```bash
sudo dnf install java-21-amazon-corretto -y
java -version
```

### Install Docker
```bash
sudo dnf install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
sudo usermod -aG docker jenkins
```

### Install Jenkins
```bash
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
sudo dnf install jenkins -y
sudo systemctl start jenkins
sudo systemctl enable jenkins
sudo systemctl status jenkins
```

### Access Jenkins UI

1. Open `http://<your-ec2-ip>:8080`
2. Get the initial password:
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```
3. Paste it into the **Unlock Jenkins** screen
4. Click **Install suggested plugins**
5. Create your admin user → **Save and Finish**

---

## 3. Required Plugins

Go to **Manage Jenkins → Plugins → Available plugins**, search and install each one:

### Core

| Plugin | Why |
|--------|-----|
| **Git** | Clone the GitHub repo |
| **GitHub Integration** | Webhook triggers and GitHub status updates |
| **NodeJS** | Run `npm` commands in pipelines |
| **Docker Pipeline** | `docker.build()` and `docker.push()` in pipelines |
| **Docker Commons** | Shared Docker tooling used by Docker Pipeline |
| **Credentials Binding** | Inject secrets (DockerHub, GitHub) as env variables |
| **Pipeline** | Declarative pipeline support (Jenkinsfile) |
| **Pipeline: Stage View** | Visual stage-by-stage progress on the job page |

### Visibility & Monitoring

| Plugin | Why |
|--------|-----|
| **Blue Ocean** | Modern pipeline UI with visual stage graph and logs per step |
| **Build Timestamp** | Adds `BUILD_TIMESTAMP` variable — use it in image tags |
| **Timestamper** | Prints timestamps next to every log line in Console Output |
| **Console Column** | Shows a direct Console Output link on the jobs dashboard |
| **Build Monitor View** | Big-screen dashboard showing live build status for all jobs |
| **Dashboard View** | Customisable dashboard with build stats and job summaries |

### Notifications

| Plugin | Why |
|--------|-----|
| **Slack Notification** | Send build success/failure messages to a Slack channel |
| **Email Extension** | Send detailed HTML build reports by email |
| **Mailer** | Basic email notifications on build failure or recovery |

### Utilities

| Plugin | Why |
|--------|-----|
| **Workspace Cleanup** | `cleanWs()` — deletes workspace after each build |
| **AnsiColor** | Renders ANSI colour codes in Console Output (coloured logs) |
| **Rebuild** | Adds a **Rebuild** button to re-run a build with the same parameters |
| **Job DSL** | Define and create jobs as code using a Groovy DSL |
| **Parameterized Trigger** | Trigger downstream jobs and pass parameters between them |

After installing all plugins → click **Restart Jenkins** when prompted.

### Enable Timestamper globally

After installing the Timestamper plugin:

1. Go to **Manage Jenkins → System**
2. Scroll to **Timestamper**
3. Set System clock timezone to your timezone
4. Click **Save**

To enable it on a specific job, in the **Build Environment** tab check **Add timestamps to the Console Output**.

To enable it in a Jenkinsfile:
```groovy
options {
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '10'))
}
```

### Enable Blue Ocean

After installing Blue Ocean, access it at:
```
http://<jenkins-ip>:8080/blue
```
It shows each stage as a visual node, with logs scoped per step — much easier to read than the classic UI.

### Enable Build Timestamp

After installing the Build Timestamp plugin:

1. Go to **Manage Jenkins → System**
2. Scroll to **Build Timestamp**
3. Set the pattern, e.g. `yyyyMMdd-HHmmss`
4. Click **Save**

Now use `${BUILD_TIMESTAMP}` in your pipeline instead of generating a timestamp manually:
```groovy
environment {
    IMAGE_TAG = "build-${BUILD_NUMBER}-${BUILD_TIMESTAMP}"
}
```

---

## 4. Configure the NodeJS Tool

The Jenkinsfile uses `tools { nodejs 'NodeJS-18' }`. You must register this name.

1. Go to **Manage Jenkins → Tools**
2. Scroll to **NodeJS installations** → click **Add NodeJS**
3. Fill in:
   - Name: `NodeJS-18`
   - Version: `NodeJS 18.x`
4. Click **Save**

---

## 5. Add DockerHub Credentials

The pipeline pushes to `chafah/landmark-web-app` on DockerHub. Jenkins needs your DockerHub login stored securely.

1. Go to **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**
2. Fill in:

| Field | Value |
|-------|-------|
| Kind | Username with password |
| Username | `chafah` |
| Password | your DockerHub password or access token |
| ID | `dockerhub-creds` |
| Description | DockerHub |

3. Click **Create**

> To use a DockerHub access token instead of your password (recommended): DockerHub → **Account Settings → Security → New Access Token**

---

## 6. GitHub Credentials (Private Repo Only)

If your repo is **public**, skip this section — Jenkins can clone it without credentials.

If your repo is **private**:

1. Go to **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**
2. Fill in:

| Field | Value |
|-------|-------|
| Kind | Username with password |
| Username | your GitHub username |
| Password | your GitHub Personal Access Token |
| ID | `github-creds` |
| Description | GitHub |

3. Click **Create**

**To generate a GitHub Personal Access Token:**
- GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
- Click **Generate new token**
- Select scope: `repo`
- Copy the token and paste it as the password above

---

## 7. Job Types

There are three ways to run this project in Jenkins. All three do the same thing:
**clone → test → build Docker image → run container → push to DockerHub**

---

### Job Type 1: Freestyle Job

The simplest job type. No Jenkinsfile needed — you configure everything through the UI.

**Steps:**

1. Click **New Item**
2. Name it `landmark-freestyle`
3. Select **Freestyle project** → click **OK**

**Source Code Management tab:**
- Select **Git**
- Repository URL: `https://github.com/chafah/landmark-web-app.git`
- Credentials: `github-creds` (only if private repo)
- Branch: `*/main`

**Build Environment tab:**
- Check **Provide Node & npm bin/folder to PATH**
- NodeJS Installation: `NodeJS-18`

**Build Steps tab → Add build step → Execute shell:**

Paste this — one block at a time (add 4 separate shell steps):

**Step 1 — Install and test:**
```bash
npm ci
npm test
cd server && npm ci && npm test
```

**Step 2 — Build Docker image:**
```bash
docker build -t chafah/landmark-web-app:build-${BUILD_NUMBER} .
```

**Step 3 — Run and verify container:**
```bash
docker rm -f landmark-webapp || true
docker run -d --name landmark-webapp -p 5000:5000 chafah/landmark-web-app:build-${BUILD_NUMBER}
sleep 5
curl -f http://localhost:5000 || exit 1
docker stop landmark-webapp && docker rm landmark-webapp
```

> `docker rm -f landmark-webapp || true` removes any leftover container from a previous build so the job can run multiple times without a name conflict.

**Step 4 — Push to DockerHub:**
```bash
echo $DH_PASS | docker login -u $DH_USER --password-stdin
docker push chafah/landmark-web-app:build-${BUILD_NUMBER}
docker logout
docker rmi chafah/landmark-web-app:build-${BUILD_NUMBER} || true
```

For Step 4 to work, inject the DockerHub credentials:
- **Build Environment tab** → check **Use secret text(s) or file(s)**
- Add **Username and password (separated)**:
  - Username variable: `DH_USER`
  - Password variable: `DH_PASS`
  - Credentials: `dockerhub-creds`

Click **Save** → **Build Now**

Watch the output under **Console Output**.

---

### Job Type 2: Declarative Pipeline (uses the Jenkinsfile)

This reads the `Jenkinsfile` directly from the repo. The pipeline is version-controlled alongside the code.

**Steps:**

1. Click **New Item**
2. Name it `landmark-pipeline`
3. Select **Pipeline** → click **OK**

**Pipeline tab:**
- Definition: **Pipeline script from SCM**
- SCM: **Git**
- Repository URL: `https://github.com/chafah/landmark-web-app.git`
- Credentials: `github-creds` (only if private repo)
- Branch: `*/main`
- Script Path: `Jenkinsfile`

Click **Save** → **Build Now**

The `Jenkinsfile` in the repo root will run these stages:

| Stage | What happens |
|-------|-------------|
| Checkout | Clones the repo |
| Install & Test | `npm ci`, `npm test` for frontend and server |
| Build Docker Image | `docker build -t chafah/landmark-web-app:build-N .` |
| Run Container | Starts the container, hits `/api/students`, stops it |
| Push to DockerHub | Logs in and pushes the image |

Watch progress under **Stage View** on the job page.

---

### Job Type 3: Scripted Pipeline

Scripted pipelines use `node {}` blocks and plain Groovy. More flexible than declarative but more verbose. Good to know for complex logic.

**Steps:**

1. Click **New Item**
2. Name it `landmark-scripted`
3. Select **Pipeline** → click **OK**

**Pipeline tab:**
- Definition: **Pipeline script**
- Paste the script below directly into the text box

```groovy
node {

    def dockerRepo = 'chafah/landmark-web-app'
    def imageTag   = "build-${env.BUILD_NUMBER}"

    stage('Checkout') {
        checkout scm
    }

    stage('Install & Test') {
        nodejs('NodeJS-18') {
            sh 'npm ci && npm test'
            sh 'cd server && npm ci && npm test'
        }
    }

    stage('Build Docker Image') {
        sh "docker build -t ${dockerRepo}:${imageTag} ."
    }

    stage('Run Container') {
        sh 'docker rm -f landmark-test || true'
        sh "docker run -d --name landmark-test -p 5000:5000 ${dockerRepo}:${imageTag}"
        sh 'sleep 5'
        sh 'curl -f http://localhost:5000 || exit 1'
        sh 'docker stop landmark-test && docker rm landmark-test'
    }

    stage('Push to DockerHub') {
        withCredentials([usernamePassword(
            credentialsId: 'dockerhub-creds',
            usernameVariable: 'DH_USER',
            passwordVariable: 'DH_PASS'
        )]) {
            sh 'echo $DH_PASS | docker login -u $DH_USER --password-stdin'
            sh "docker push ${dockerRepo}:${imageTag}"
            sh 'docker logout'
        }
    }

    stage('Cleanup') {
        sh "docker rmi ${dockerRepo}:${imageTag} || true"
        cleanWs()
    }
}
```

Click **Save** → **Build Now**

---

## 8. Trigger Builds Automatically (Webhook)

Instead of clicking **Build Now** manually, configure GitHub to trigger Jenkins on every `git push`.

**In Jenkins:**
1. Open your job → **Configure**
2. **Build Triggers** tab → check **GitHub hook trigger for GITScm polling**
3. Click **Save**

**In GitHub:**
1. Go to your repo → **Settings → Webhooks → Add webhook**
2. Fill in:
   - Payload URL: `http://<jenkins-ip>:8080/github-webhook/`
   - Content type: `application/json`
   - Which events: **Just the push event**
3. Click **Add webhook**

Now every `git push` automatically triggers the Jenkins job.

---

After a successful build, verify the image was pushed:

```bash
# On the Jenkins server or your local machine
docker pull chafah/landmark-web-app:build-<BUILD_NUMBER>
docker run -p 5000:5000 chafah/landmark-web-app:build-<BUILD_NUMBER>
```

Or check DockerHub directly:
```
https://hub.docker.com/r/chafah/landmark-web-app/tags
```

---

## 11. Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm: command not found` | NodeJS tool not configured — check **Manage Jenkins → Tools → NodeJS** |
| `docker: permission denied` | Run `sudo usermod -aG docker jenkins` then restart Jenkins |
| `dockerhub-creds not found` | Credential ID typo — must be exactly `dockerhub-creds` |
| Container name already in use | `docker rm -f landmark-webapp` then build again |
| `curl: (7) Failed to connect` | App didn't start in time — increase `sleep 5` to `sleep 10` |
| GitHub clone fails (private repo) | Add `github-creds` credential and select it in the job config |
