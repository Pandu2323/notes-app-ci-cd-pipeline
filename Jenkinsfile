// ═══════════════════════════════════════════════════════════════════════════════
//  Notes App — Jenkins Declarative Pipeline
//  Triggered by: GitHub Webhook (push to main/master)
//  Stages: Checkout → Test → Build → Deploy → Health Check → Notify
// ═══════════════════════════════════════════════════════════════════════════════

pipeline {
    agent any

    // ── Environment Variables ──────────────────────────────────────────────────
    environment {
        APP_NAME        = 'notes-app'
        COMPOSE_FILE    = 'docker-compose.yml'
        BACKEND_IMAGE   = 'notes-backend'
        FRONTEND_IMAGE  = 'notes-frontend'
        BUILD_TIMESTAMP = sh(script: 'date +%Y%m%d-%H%M%S', returnStdout: true).trim()
        APP_VERSION     = "${BUILD_NUMBER}-${GIT_COMMIT?.take(7) ?: 'local'}"
        BACKEND_URL     = 'http://localhost:5000'
        FRONTEND_URL    = 'http://localhost:3000'
        // Set these in Jenkins → Manage Jenkins → Credentials if needed:
        // DOCKERHUB_CREDS = credentials('dockerhub-credentials')
    }

    // ── Pipeline Options ───────────────────────────────────────────────────────
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
        ansiColor('xterm')
    }

    // ── Triggers ───────────────────────────────────────────────────────────────
    triggers {
        githubPush()
        // pollSCM('H/5 * * * *')  // fallback: poll every 5 min
    }

    stages {

        // ── Stage 1: Checkout ────────────────────────────────────────────────
        stage('📥 Checkout') {
            steps {
                script {
                    echo "╔══════════════════════════════════╗"
                    echo "║  Notes App CI/CD Pipeline        ║"
                    echo "║  Build #${BUILD_NUMBER}          ║"
                    echo "╚══════════════════════════════════╝"
                    echo "Branch  : ${GIT_BRANCH ?: 'unknown'}"
                    echo "Commit  : ${GIT_COMMIT?.take(7) ?: 'unknown'}"
                    echo "Version : ${APP_VERSION}"
                }
                // Code is already checked out by Jenkins SCM config
                sh 'git log --oneline -5 || echo "git log not available"'
            }
        }

        // ── Stage 2: Backend Tests ───────────────────────────────────────────
        stage('🧪 Backend Tests') {
            steps {
                dir('backend') {
                    sh '''
                        echo "Installing backend dependencies..."
                        npm ci --prefer-offline 2>/dev/null || npm install
                        
                        echo "Running tests..."
                        NODE_ENV=test npm test -- --forceExit
                    '''
                }
            }
            post {
                always {
                    // Publish test results if junit reporter is added
                    // junit 'backend/coverage/junit.xml'
                    echo "Backend tests completed"
                }
            }
        }

        // ── Stage 3: Frontend Tests ──────────────────────────────────────────
        stage('🧪 Frontend Tests') {
            steps {
                dir('frontend') {
                    sh '''
                        echo "Installing frontend dependencies..."
                        npm ci --prefer-offline 2>/dev/null || npm install
                        
                        echo "Running frontend tests..."
                        CI=true npm test -- --passWithNoTests
                    '''
                }
            }
        }

        // ── Stage 4: Docker Build ────────────────────────────────────────────
        stage('🐳 Docker Build') {
            steps {
                script {
                    echo "Building Docker images — version: ${APP_VERSION}"
                    
                    sh """
                        export APP_VERSION=${APP_VERSION}
                        
                        # Build backend image
                        docker build \\
                            --tag ${BACKEND_IMAGE}:${APP_VERSION} \\
                            --tag ${BACKEND_IMAGE}:latest \\
                            --file backend/Dockerfile \\
                            backend/
                        
                        # Build frontend image
                        docker build \\
                            --tag ${FRONTEND_IMAGE}:${APP_VERSION} \\
                            --tag ${FRONTEND_IMAGE}:latest \\
                            --build-arg REACT_APP_VERSION=${APP_VERSION} \\
                            --file frontend/Dockerfile \\
                            frontend/
                    """
                    
                    echo "Docker images built successfully"
                    sh 'docker images | grep -E "notes-(backend|frontend)"'
                }
            }
        }

        // ── Stage 5: Deploy ──────────────────────────────────────────────────
        stage('🚀 Deploy') {
            steps {
                script {
                    echo "Deploying Notes App..."
                    
                    sh """
                        export APP_VERSION=${APP_VERSION}
                        
                        # Stop existing containers gracefully
                        docker compose -f ${COMPOSE_FILE} down --remove-orphans || true
                        
                        # Pull latest images + start
                        docker compose -f ${COMPOSE_FILE} up -d --build
                        
                        echo "Waiting for containers to be ready..."
                        sleep 15
                    """
                }
            }
        }

        // ── Stage 6: Health Check ────────────────────────────────────────────
        stage('❤️ Health Check') {
            steps {
                sh '''
                    echo "Checking backend health..."
                    
                    MAX_RETRIES=10
                    RETRY=0
                    until curl -sf http://localhost:5000/health > /dev/null 2>&1; do
                        RETRY=$((RETRY + 1))
                        if [ $RETRY -ge $MAX_RETRIES ]; then
                            echo "❌ Backend health check FAILED after ${MAX_RETRIES} retries"
                            docker compose logs backend --tail=30
                            exit 1
                        fi
                        echo "  Waiting for backend... (${RETRY}/${MAX_RETRIES})"
                        sleep 5
                    done
                    
                    echo "✅ Backend is healthy!"
                    curl -s http://localhost:5000/health | python3 -m json.tool || true
                    
                    echo "Checking frontend health..."
                    sleep 5
                    HTTP_STATUS=$(curl -so /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
                    if [ "$HTTP_STATUS" = "200" ]; then
                        echo "✅ Frontend is healthy! (HTTP ${HTTP_STATUS})"
                    else
                        echo "⚠️  Frontend returned HTTP ${HTTP_STATUS}"
                        docker compose logs frontend --tail=20
                    fi
                '''
            }
        }

        // ── Stage 7: Cleanup ─────────────────────────────────────────────────
        stage('🧹 Cleanup') {
            steps {
                sh '''
                    echo "Cleaning up unused Docker resources..."
                    docker image prune -f --filter "until=48h" || true
                    docker volume prune -f || true
                    echo "Cleanup done"
                '''
            }
        }
    }

    // ── Post Actions ──────────────────────────────────────────────────────────
    post {
        success {
            echo """
╔══════════════════════════════════════════╗
║  ✅ DEPLOYMENT SUCCESSFUL                ║
║                                          ║
║  App:      Notes App v${APP_VERSION}
║  Frontend: http://localhost:3000         ║
║  Backend:  http://localhost:5000         ║
║  Build:    #${BUILD_NUMBER}              ║
╚══════════════════════════════════════════╝
            """
        }

        failure {
            echo """
╔══════════════════════════════════════════╗
║  ❌ DEPLOYMENT FAILED                    ║
║  Build: #${BUILD_NUMBER}                 ║
║  Check the logs above for details        ║
╚══════════════════════════════════════════╝
            """
            sh 'docker compose logs --tail=50 || true'
        }

        always {
            echo "Pipeline finished — Build #${BUILD_NUMBER}"
            // Uncomment for Slack/Email notifications:
            // slackSend(channel: '#deployments', message: "Build #${BUILD_NUMBER}: ${currentBuild.result}")
        }
    }
}
