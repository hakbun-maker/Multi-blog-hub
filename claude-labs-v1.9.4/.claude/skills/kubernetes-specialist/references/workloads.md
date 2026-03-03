# Kubernetes Workloads 상세 가이드

> **로드 시점**: Deployment, StatefulSet, Job, CronJob, DaemonSet 작성 시

---

## 개념

Kubernetes Workload는 클러스터에서 실행되는 애플리케이션을 추상화한 리소스입니다. Pod는 최소 배포 단위이며, 상위 리소스(Deployment, StatefulSet 등)가 Pod의 생명주기를 관리합니다.

---

## 1. Deployment (무상태 애플리케이션)

### 개념
- Stateless 애플리케이션을 위한 기본 워크로드
- ReplicaSet을 내부적으로 생성하여 Pod 복제 관리
- Rolling Update, Rollback 지원

### 기본 패턴

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  labels:
    app: web-app
    tier: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
        tier: frontend
    spec:
      containers:
      - name: web-app
        image: myregistry.io/web-app:v1.2.3
        ports:
        - containerPort: 8080
          name: http
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db_host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db_password
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        volumeMounts:
        - name: config-volume
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config-volume
        configMap:
          name: app-config
```

### Rolling Update 전략

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # 업데이트 중 추가로 생성할 Pod 수
      maxUnavailable: 0    # 동시에 다운될 수 있는 Pod 수
```

**설명**:
- `maxSurge: 1`: replicas=3이면 업데이트 중 최대 4개 Pod 존재
- `maxUnavailable: 0`: 항상 3개 Pod가 Running 상태 유지 (무중단 배포)

### Recreate 전략

```yaml
spec:
  strategy:
    type: Recreate  # 모든 Pod를 먼저 종료 후 새 버전 생성 (다운타임 발생)
```

### 배포 및 롤백

```bash
# 배포
kubectl apply -f deployment.yaml

# 롤아웃 상태 확인
kubectl rollout status deployment/web-app

# 히스토리 확인
kubectl rollout history deployment/web-app

# 이전 버전으로 롤백
kubectl rollout undo deployment/web-app

# 특정 Revision으로 롤백
kubectl rollout undo deployment/web-app --to-revision=2

# 이미지만 업데이트 (선언적 방식보다 빠른 테스트용)
kubectl set image deployment/web-app web-app=myregistry.io/web-app:v1.2.4
```

---

## 2. StatefulSet (상태 유지 애플리케이션)

### 개념
- Stateful 애플리케이션 (데이터베이스, 메시지 큐 등)을 위한 워크로드
- Pod 이름이 순서대로 고정됨 (web-0, web-1, web-2)
- 각 Pod가 독립적인 PersistentVolumeClaim (PVC) 보유

### 기본 패턴

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
spec:
  clusterIP: None  # Headless Service (각 Pod에 DNS 엔트리 생성)
  selector:
    app: postgres
  ports:
  - port: 5432
    name: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-headless
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 10Gi
```

### 순서 보장

- **생성 순서**: postgres-0 → postgres-1 → postgres-2 (순차)
- **삭제 순서**: postgres-2 → postgres-1 → postgres-0 (역순)
- **업데이트**: RollingUpdate는 역순으로 진행 (2 → 1 → 0)

### Pod DNS

```bash
# Headless Service를 통한 개별 Pod 접근
postgres-0.postgres-headless.default.svc.cluster.local
postgres-1.postgres-headless.default.svc.cluster.local
postgres-2.postgres-headless.default.svc.cluster.local
```

---

## 3. DaemonSet (모든 노드에 Pod 배포)

### 개념
- 클러스터의 모든 노드(또는 특정 노드)에 Pod를 1개씩 배포
- 로그 수집기, 모니터링 에이전트, 네트워크 플러그인 등에 사용

### 기본 패턴

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      nodeSelector:
        logging: enabled  # 이 레이블이 있는 노드에만 배포
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule  # Master 노드에도 배포 허용
      containers:
      - name: fluentd
        image: fluentd:v1.15
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 200Mi
          limits:
            cpu: 200m
            memory: 400Mi
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

---

## 4. Job (일회성 작업)

### 개념
- 한 번 실행되고 종료되는 배치 작업
- 성공(exit 0) 시 Pod 종료, 실패 시 재시작 또는 재생성

### 기본 패턴

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
spec:
  completions: 1      # 성공 완료해야 할 Pod 수
  parallelism: 1      # 동시 실행 Pod 수
  backoffLimit: 4     # 최대 재시도 횟수
  ttlSecondsAfterFinished: 3600  # 완료 후 1시간 뒤 자동 삭제
  template:
    spec:
      restartPolicy: OnFailure  # Job은 Never 또는 OnFailure만 가능
      containers:
      - name: migration
        image: myapp/migration:v1.0
        command: ["python", "migrate.py"]
        env:
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
```

### 병렬 실행

```yaml
spec:
  completions: 10     # 총 10개 Pod가 성공해야 완료
  parallelism: 3      # 동시에 3개씩 실행
```

---

## 5. CronJob (주기적 작업)

### 개념
- Linux cron 문법으로 주기적으로 Job 생성
- 백업, 리포트 생성, 정기 배치 등에 사용

### 기본 패턴

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-backup
spec:
  schedule: "0 2 * * *"  # 매일 오전 2시
  timezone: "Asia/Seoul"
  concurrencyPolicy: Forbid  # 동시 실행 금지 (Replace, Allow도 가능)
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: backup-tool:v1.0
            command: ["/bin/sh", "-c", "backup.sh && upload.sh"]
            env:
            - name: S3_BUCKET
              value: "s3://my-backups"
            resources:
              requests:
                cpu: 200m
                memory: 512Mi
              limits:
                cpu: 500m
                memory: 1Gi
```

### Cron 문법

```
# ┌───────────── 분 (0 - 59)
# │ ┌───────────── 시 (0 - 23)
# │ │ ┌───────────── 일 (1 - 31)
# │ │ │ ┌───────────── 월 (1 - 12)
# │ │ │ │ ┌───────────── 요일 (0 - 6) (일요일=0)
# │ │ │ │ │
# * * * * *

"0 2 * * *"        # 매일 오전 2시
"*/15 * * * *"     # 15분마다
"0 0 * * 0"        # 매주 일요일 자정
"0 9 1 * *"        # 매월 1일 오전 9시
```

---

## 6. Pod 설계 베스트 프랙티스

### Resources (CPU, Memory)

```yaml
spec:
  containers:
  - name: app
    resources:
      requests:
        cpu: 200m        # 최소 보장 (스케줄링 기준)
        memory: 256Mi
      limits:
        cpu: 500m        # 최대 허용 (초과 시 throttling)
        memory: 512Mi    # 초과 시 OOMKilled
```

**중요**:
- `requests`: 스케줄러가 노드 배치 시 사용. 클러스터 전체 requests 합이 노드 용량 초과 시 Pending
- `limits`: 컨테이너가 사용할 수 있는 최대치. Memory 초과 시 Pod 재시작

### Probes (헬스체크)

#### Liveness Probe (살아있는지 검사)

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30  # 최초 검사까지 대기 시간
  periodSeconds: 10        # 검사 주기
  timeoutSeconds: 5        # 응답 타임아웃
  failureThreshold: 3      # 연속 실패 3회 시 재시작
```

#### Readiness Probe (트래픽 받을 준비 검사)

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 2      # 실패 시 Service에서 제외 (재시작 안 함)
```

#### Startup Probe (초기 기동 검사)

```yaml
startupProbe:
  httpGet:
    path: /startup
    port: 8080
  initialDelaySeconds: 0
  periodSeconds: 10
  failureThreshold: 30     # 최대 300초(10×30) 대기
```

**차이점**:
- **Liveness**: 실패 시 Pod 재시작
- **Readiness**: 실패 시 Service 엔드포인트에서 제거 (재시작 안 함)
- **Startup**: 느린 기동 애플리케이션을 위해 Liveness보다 먼저 동작

### SecurityContext (보안 설정)

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
```

---

## 7. ConfigMap / Secret 관리

### ConfigMap (일반 설정)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database.host: "postgres.production.svc.cluster.local"
  database.port: "5432"
  app.config.yaml: |
    server:
      port: 8080
      timeout: 30s
    logging:
      level: info
```

### Secret (민감 정보)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  db_password: "mypassword"  # stringData는 평문 (자동 base64 인코딩)
data:
  api_key: bXlhcGlrZXk=      # data는 base64 인코딩 필요
```

### Pod에서 사용

```yaml
# 환경변수로 주입
env:
- name: DB_HOST
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: database.host
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: app-secrets
      key: db_password

# 파일로 마운트
volumeMounts:
- name: config
  mountPath: /etc/config
volumes:
- name: config
  configMap:
    name: app-config
```

---

## 8. Horizontal Pod Autoscaler (HPA)

### 개념
- CPU/메모리 사용률 또는 커스텀 메트릭 기반 자동 스케일링
- metrics-server 필요

### 기본 패턴

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # CPU 평균 70% 초과 시 스케일 아웃
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5분간 안정화 후 스케일 인
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60  # 분당 최대 50% 축소
```

---

## 9. Helm 차트 구조

### 개념
- Kubernetes 매니페스트의 패키지 관리자
- 템플릿 + 값(values.yaml) 기반 설정

### 기본 구조

```
my-chart/
├── Chart.yaml          # 차트 메타데이터
├── values.yaml         # 기본 설정 값
├── charts/             # 의존 차트
└── templates/          # 매니페스트 템플릿
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── configmap.yaml
    ├── _helpers.tpl    # 공통 템플릿 함수
    └── NOTES.txt       # 설치 후 안내 메시지
```

### values.yaml

```yaml
replicaCount: 3

image:
  repository: myregistry.io/web-app
  tag: v1.2.3
  pullPolicy: IfNotPresent

resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

ingress:
  enabled: true
  className: nginx
  hosts:
  - host: app.example.com
    paths:
    - path: /
      pathType: Prefix
```

### templates/deployment.yaml (템플릿)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-chart.fullname" . }}
  labels:
    {{- include "my-chart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "my-chart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-chart.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - containerPort: {{ .Values.service.targetPort }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
```

### Helm 명령

```bash
# 차트 설치
helm install my-release my-chart/

# 값 오버라이드
helm install my-release my-chart/ -f custom-values.yaml

# 또는 커맨드라인으로
helm install my-release my-chart/ --set replicaCount=5

# 업그레이드
helm upgrade my-release my-chart/

# 롤백
helm rollback my-release 1

# 제거
helm uninstall my-release
```

---

## 트러블슈팅

### Pod가 Pending 상태

```bash
kubectl describe pod <pod-name>

# 원인 1: 노드 리소스 부족
Events:
  Warning  FailedScheduling  pod has insufficient cpu

# 해결: requests 낮추기 또는 노드 추가

# 원인 2: PVC가 Pending
Events:
  Warning  ProvisioningFailed  storageclass not found

# 해결: StorageClass 생성
```

### Pod가 CrashLoopBackOff

```bash
kubectl logs <pod-name>
kubectl logs <pod-name> --previous  # 이전 컨테이너 로그

# 원인 1: 애플리케이션 에러
# 해결: 로그 확인 후 코드 수정

# 원인 2: Liveness Probe 실패
# 해결: initialDelaySeconds 늘리기
```

### ImagePullBackOff

```bash
kubectl describe pod <pod-name>

Events:
  Warning  Failed  Failed to pull image "myregistry.io/app:v1": unauthorized

# 해결: imagePullSecrets 추가
spec:
  imagePullSecrets:
  - name: regcred
```

---

**마지막 업데이트**: 2026-02-15
