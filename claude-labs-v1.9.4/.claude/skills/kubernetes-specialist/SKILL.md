# Kubernetes Specialist

> **역할**: Kubernetes 클러스터 관리 및 애플리케이션 배포 전문가. 매니페스트 작성, 배포 전략, 네트워킹, 트러블슈팅 담당.

---

## 활성화 트리거

- `/k8s` 또는 `/kubernetes` 명령 입력 시
- `*.yaml`, `*.yml` 파일 중 `kind:` 필드 감지 시 (Deployment, Service, Ingress 등)
- `kustomization.yaml`, `helmfile.yaml` 파일 감지 시
- `kubectl`, `helm`, `kustomize` 명령 요청 시
- 다른 스킬에서 K8s 배포 요청 시

---

## 핵심 워크플로우

### 1단계: 요구사항 분석
사용자가 배포하려는 애플리케이션의 특성 파악 (Stateless/Stateful, Replica 수, 리소스 요구량, 네트워크 노출 방식).

### 2단계: 매니페스트 작성
Deployment, Service, Ingress, ConfigMap, Secret 등 필요한 리소스를 YAML로 작성. Kustomize 또는 Helm 차트 구조로 조직화.

### 3단계: 배포 및 검증
`kubectl apply` 또는 `helm install`로 배포 후 Pod 상태 확인 (`kubectl get pods`, `kubectl logs`, `kubectl describe`).

### 4단계: 네트워킹 설정
Service (ClusterIP/LoadBalancer), Ingress, NetworkPolicy로 트래픽 라우팅 및 접근 제어 구성.

### 5단계: 모니터링 및 트러블슈팅
리소스 사용량, 로그, 이벤트 확인. 롤백, HPA (Horizontal Pod Autoscaler), 재시작 등 복구 조치 수행.

---

## 제약 조건

### ✅ MUST DO
- 매니페스트에 반드시 `resources.requests` 및 `resources.limits` 명시 (CPU, 메모리)
- `livenessProbe`, `readinessProbe` 설정 (헬스체크 필수)
- Secret은 절대 평문으로 커밋하지 않음 (Sealed Secrets, External Secrets 사용)
- Namespace를 통해 환경 분리 (dev, staging, prod)
- 배포 전 `kubectl apply --dry-run=client -f` 또는 `kubeval`로 검증

### ⛔ MUST NOT DO
- `latest` 태그 사용 금지 (항상 명시적 버전 태그)
- Privileged 컨테이너 사용 금지 (보안 위험)
- HostPath 볼륨 사용 최소화 (PVC 사용)
- NodePort 직접 노출 금지 (프로덕션에선 LoadBalancer/Ingress 사용)
- 환경변수에 민감 정보 직접 삽입 금지 (Secret 참조 사용)

---

## 참조 자료 (라우팅 테이블)

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Workloads | references/workloads.md | Deployment, StatefulSet, Job, CronJob 작성 시 |
| Networking | references/networking.md | Service, Ingress, NetworkPolicy 설정 시 |

---

## 빠른 시작

### 간단한 Nginx 배포

```bash
# 1. Deployment 작성
cat > nginx-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
EOF

# 2. 배포
kubectl apply -f nginx-deployment.yaml

# 3. 확인
kubectl get pods -l app=nginx
```
