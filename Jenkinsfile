// Pipeline CI/CD du TP4 : build des images, push sur Docker Hub, déploiement avec Docker Compose.
// Fonctionne avec Jenkins sous Windows (bat) ou sous Linux (sh).

// Exécute une commande avec sh (Linux) ou bat (Windows)
def runCmd(String cmd) {
    if (isUnix()) {
        sh cmd
    } else {
        bat cmd
    }
}

pipeline {
    agent any

    environment {
        // Nom d'utilisateur Docker Hub
        DOCKERHUB_USER = 'mohamedsedkiboukadida'

        // ID des identifiants Docker Hub créés dans Jenkins (Manage Jenkins > Credentials)
        DOCKERHUB_CREDENTIALS_ID = 'dockerhub-cred'

        IMAGE_SERVER = "${DOCKERHUB_USER}/mern-server"
        IMAGE_CLIENT = "${DOCKERHUB_USER}/mern-client"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Server Image') {
            steps {
                script { runCmd "docker build -t mern-server -t ${IMAGE_SERVER}:latest ./Server" }
            }
        }

        stage('Build Client Image') {
            steps {
                script { runCmd "docker build -t mern-client -t ${IMAGE_CLIENT}:latest ./Client" }
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
                                                  usernameVariable: 'HUB_USER',
                                                  passwordVariable: 'HUB_PASS')]) {
                    script {
                        if (isUnix()) {
                            sh 'echo "$HUB_PASS" | docker login -u "$HUB_USER" --password-stdin'
                        } else {
                            bat 'echo %HUB_PASS%| docker login -u %HUB_USER% --password-stdin'
                        }
                    }
                    script { runCmd "docker push ${IMAGE_SERVER}:latest" }
                    script { runCmd "docker push ${IMAGE_CLIENT}:latest" }
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                // Supprime d'éventuels conteneurs lancés à la main (étape 5 du TP)
                script {
                    if (isUnix()) {
                        sh 'docker rm -f client server mongodb || true'
                    } else {
                        bat 'docker rm -f client server mongodb || exit /b 0'
                    }
                }
                script { runCmd 'docker compose up -d' }
            }
        }

        stage('Verify') {
            steps {
                script { runCmd 'docker compose ps' }
                script { runCmd 'docker images' }
            }
        }
    }

    post {
        always {
            script {
                if (isUnix()) {
                    sh 'docker logout || true'
                } else {
                    bat 'docker logout || exit /b 0'
                }
            }
        }
    }
}
