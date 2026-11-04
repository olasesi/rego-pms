// Declarative CI/CD pipeline for the PMS monorepo.
//
// Requirements on the Jenkins agent:
//   - Node.js 20 tool named `node20`
//   - Docker Engine with the `docker` CLI
//   - `kubectl` configured for the target cluster (deploy stage only)
//
// Credentials to create in Jenkins:
//   - `ghcr-credentials`  username/password for the container registry
//   - `pms-kubeconfig`    kubeconfig file credential for the target cluster
//   - `pms-api-secrets`   optional; otherwise secrets are managed out-of-band

pipeline {
  agent any

  tools {
    nodejs 'node20'
  }

  options {
    timeout(time: 45, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))
    disableConcurrentBuilds()
    timestamps()
  }

  environment {
    REGISTRY      = 'ghcr.io'
    IMAGE_OWNER   = 'olasesi'
    IMAGE_REPO    = 'rego-pms'
    IMAGE_TAG     = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(12) : env.BUILD_NUMBER}"
    NODE_ENV      = 'test'
    CI            = 'true'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git rev-parse --short HEAD'
      }
    }

    stage('Install') {
      parallel {
        stage('API dependencies') {
          steps {
            dir('api') {
              sh 'npm ci --no-audit --no-fund'
            }
          }
        }
        stage('Web dependencies') {
          steps {
            sh 'npm ci --no-audit --no-fund'
          }
        }
      }
    }

    stage('Static analysis') {
      parallel {
        stage('API typecheck + lint') {
          steps {
            dir('api') {
              sh 'npm run typecheck'
              sh 'npm run lint'
            }
          }
        }
        stage('Web typecheck + lint') {
          steps {
            sh 'npm run typecheck'
            sh 'npm run lint'
          }
        }
      }
    }

    stage('Test') {
      parallel {
        stage('API tests') {
          steps {
            dir('api') {
              sh 'npm test -- --ci --runInBand'
            }
          }
          post {
            always {
              junit allowEmptyResults: true, testResults: 'api/junit.xml'
            }
          }
        }
        stage('Web tests') {
          steps {
            sh 'npm test -- --run'
          }
        }
      }
    }

    stage('Build') {
      parallel {
        stage('API build') {
          steps {
            dir('api') {
              sh 'npm run build'
            }
          }
        }
        stage('Web build') {
          steps {
            sh 'npm run build'
          }
        }
      }
    }

    stage('Container images') {
      when {
        anyOf {
          branch 'develop'
          branch 'main'
          branch 'master'
          buildingTag()
        }
      }
      steps {
        sh """
          docker build \
            --label "org.opencontainers.image.revision=${IMAGE_TAG}" \
            -t ${REGISTRY}/${IMAGE_OWNER}/${IMAGE_REPO}/api:${IMAGE_TAG} \
            -t ${REGISTRY}/${IMAGE_OWNER}/${IMAGE_REPO}/api:latest \
            api
          docker build \
            --label "org.opencontainers.image.revision=${IMAGE_TAG}" \
            --build-arg VITE_API_BASE_URL=/api/v1 \
            -t ${REGISTRY}/${IMAGE_OWNER}/${IMAGE_REPO}/web:${IMAGE_TAG} \
            -t ${REGISTRY}/${IMAGE_OWNER}/${IMAGE_REPO}/web:latest \
            .
        """
      }
    }

    stage('Security scan') {
      when {
        anyOf {
          branch 'develop'
          branch 'main'
          branch 'master'
          buildingTag()
        }
      }
      steps {
        sh """
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy:0.55.0 image \
            --severity HIGH,CRITICAL --exit-code 0 \
            ${REGISTRY}/${IMAGE_OWNER}/${IMAGE_REPO}/api:${IMAGE_TAG}
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy:0.55.0 image \
            --severity HIGH,CRITICAL --exit-code 0 \
            ${REGISTRY}/${IMAGE_OWNER}/${IMAGE_REPO}/web:${IMAGE_TAG}
        """
      }
    }

    stage('Publish images') {
      when {
        anyOf {
          branch 'develop'
          branch 'main'
          branch 'master'
          buildingTag()
        }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'ghcr-credentials', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
          sh '''
            echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin
            docker push "$REGISTRY/$IMAGE_OWNER/$IMAGE_REPO/api:$IMAGE_TAG"
            docker push "$REGISTRY/$IMAGE_OWNER/$IMAGE_REPO/api:latest"
            docker push "$REGISTRY/$IMAGE_OWNER/$IMAGE_REPO/web:$IMAGE_TAG"
            docker push "$REGISTRY/$IMAGE_OWNER/$IMAGE_REPO/web:latest"
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      when {
        anyOf {
          branch 'main'
          branch 'master'
          buildingTag()
        }
      }
      steps {
        withCredentials([file(credentialsId: 'pms-kubeconfig', variable: 'KUBECONFIG')]) {
          sh """
            kubectl apply -k deploy/k8s
            kubectl -n pms set image deployment/pms-api api=${REGISTRY}/${IMAGE_OWNER}/${IMAGE_REPO}/api:${IMAGE_TAG}
            kubectl -n pms set image deployment/pms-web web=${REGISTRY}/${IMAGE_OWNER}/${IMAGE_REPO}/web:${IMAGE_TAG}
            kubectl -n pms rollout status deployment/pms-api --timeout=180s
            kubectl -n pms rollout status deployment/pms-web --timeout=120s
          """
        }
      }
    }
  }

  post {
    success {
      echo "Pipeline succeeded for ${env.BRANCH_NAME} @ ${env.IMAGE_TAG}"
    }
    failure {
      echo "Pipeline failed for ${env.BRANCH_NAME} @ ${env.IMAGE_TAG}"
    }
    always {
      cleanWs()
    }
  }
}
