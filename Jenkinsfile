pipeline {
    agent any

    tools {
        nodejs 'NodeJS-18'
    }

    environment {
        DOCKER_REPO = 'ddankwah/landmark-web-app'
        IMAGE_TAG   = "build-${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install & Test') {
            steps {
                sh 'npm ci'
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t ${DOCKER_REPO}:${IMAGE_TAG} .'
            }
        }

        stage('Run Container') {
            steps {
                sh 'docker rm -f landmark-test || true'
                sh 'docker run -d --name landmark-test -p 5000:5000 ${DOCKER_REPO}:${IMAGE_TAG}'
                sh 'sleep 5'
                sh 'curl -f http://localhost:5000 || exit 1'
                sh 'docker stop landmark-test && docker rm landmark-test'
            }
        }

        stage('Push to DockerHub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_PASS'
                )]) {
                    sh 'echo $DOCKERHUB_PASS | docker login -u $DOCKERHUB_USER --password-stdin'
                    sh 'docker push ${DOCKER_REPO}:${IMAGE_TAG}'
                    sh 'docker logout'
                }
            }
        }

    }

    stage('Deploy to Development') {
    when {
        branch 'develop'
    }
    steps {
        echo 'Deploying to DEVELOPMENT'
    }
}

stage('Deploy to Staging') {
    when {
        branch 'release'
    }
    steps {
        echo 'Deploying to STAGING'
    }
}

stage('Deploy to Production') {
    when {
        branch 'main'
    }
    steps {
        echo 'Deploying to PRODUCTION'
    }
}
    post {
        success {
            echo "Pipeline succeeded! Image pushed: ${DOCKER_REPO}:${IMAGE_TAG}"
        }
        failure {
            echo 'Pipeline failed!'
        }
        always {
            sh 'docker rmi ${DOCKER_REPO}:${IMAGE_TAG} || true'
            cleanWs()
        }
    }
}
