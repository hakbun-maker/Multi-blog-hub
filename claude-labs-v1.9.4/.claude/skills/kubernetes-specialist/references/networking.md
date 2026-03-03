# Kubernetes Networking 상세 가이드

> **로드 시점**: Service, Ingress, NetworkPolicy 설정 시

---

## 개념

Kubernetes 네트워킹은 Pod 간 통신, 외부 노출, 트래픽 제어를 담당합니다. Service가 Pod의 안정적인 엔드포인트를 제공하고, Ingress가 L7 라우팅, NetworkPolicy가 접근 제어를 수행합니다.

---

## 1. Service (Pod 엔드포인트 추상화)

### 개념
- Pod는 언제든 재생성되어 IP가 변경될 수 있음
- Service는 고정된 ClusterIP 또는 DNS 이름으로 Pod 그룹에 접근
- Label Selector로 대상 Pod를 자동 탐지

---

## 2. ClusterIP (클러스터 내부 통신)

### 개념
- 클러스터 내부에서만 접근 가능한 가상 IP
- 기본 Service 타입

### 기본 패턴

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: production
spec:
  type: ClusterIP  # 기본값이므로 생략 가능
  selector:
    app: backend
    tier: api
  ports:
  - name: http
    protocol: TCP
    port: 80        # Service가 노출하는 포트
    targetPort: 8080  # Pod의 컨테이너 포트
  sessionAffinity: ClientIP  # 동일 클라이언트 → 동일 Pod (선택사항)
```

### 접근 방법

```bash
# 같은 Namespace
curl http://backend-service/api/users

# 다른 Namespace
curl http://backend-service.production.svc.cluster.local/api/users

# DNS 형식: <service-name>.<namespace>.svc.cluster.local
```

---

## 3. NodePort (노드 포트로 외부 노출)

### 개념
- 모든 노드의 특정 포트(30000-32767)로 Service 노출
- 외부에서 `<NodeIP>:<NodePort>`로 접근

### 기본 패턴

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-nodeport
spec:
  type: NodePort
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080  # 생략 시 자동 할당 (30000-32767)
```

### 접근 방법

```bash
# 노드 IP 확인
kubectl get nodes -o wide

# 외부에서 접근
curl http://192.168.1.10:30080
```

**주의**:
- 프로덕션에서는 사용 지양 (포트 범위 제한, 노드 IP 고정 필요)
- LoadBalancer 또는 Ingress 사용 권장

---

## 4. LoadBalancer (클라우드 로드밸런서)

### 개념
- 클라우드 제공자(AWS, GCP, Azure)의 L4 로드밸런서 자동 생성
- 외부 IP로 접근 가능

### 기본 패턴

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-lb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"  # AWS NLB
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
  loadBalancerSourceRanges:
  - 203.0.113.0/24  # 특정 IP 대역만 허용 (선택사항)
```

### 확인

```bash
kubectl get svc web-app-lb

# EXTERNAL-IP 확인 (클라우드 LB의 공개 IP)
# 예: a1b2c3d4e5f6.us-west-2.elb.amazonaws.com
```

**비용 주의**:
- LoadBalancer마다 클라우드 비용 발생 (AWS ALB: 월 ~$20)
- 여러 Service를 Ingress로 통합하여 비용 절감 권장

---

## 5. Headless Service (DNS 기반 직접 Pod 접근)

### 개념
- `clusterIP: None`으로 설정 시 Service는 가상 IP 없이 DNS만 제공
- StatefulSet에서 개별 Pod에 접근할 때 사용

### 기본 패턴

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    name: postgres
```

### DNS 레코드

```bash
# StatefulSet Pod 이름
postgres-0.postgres-headless.default.svc.cluster.local
postgres-1.postgres-headless.default.svc.cluster.local
postgres-2.postgres-headless.default.svc.cluster.local
```

---

## 6. Ingress (L7 HTTP 라우팅)

### 개념
- HTTP/HTTPS 트래픽을 호스트/경로 기반으로 여러 Service로 라우팅
- Ingress Controller 필요 (nginx, traefik, haproxy 등)

### Ingress Controller 설치 (nginx 예시)

```bash
# Helm으로 nginx-ingress 설치
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

### 기본 패턴 (단일 호스트)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod  # TLS 자동 발급
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls  # TLS 인증서 Secret
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

### 경로 기반 라우팅

```yaml
rules:
- host: app.example.com
  http:
    paths:
    - path: /app
      pathType: Prefix
      backend:
        service:
          name: app-service
          port:
            number: 80
    - path: /blog
      pathType: Prefix
      backend:
        service:
          name: blog-service
          port:
            number: 80
```

### 호스트 기반 라우팅

```yaml
rules:
- host: app.example.com
  http:
    paths:
    - path: /
      pathType: Prefix
      backend:
        service:
          name: app-service
          port:
            number: 80
- host: api.example.com
  http:
    paths:
    - path: /
      pathType: Prefix
      backend:
        service:
          name: api-service
          port:
            number: 80
```

### HTTPS 리다이렉트

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

### 유용한 Ingress Annotations (nginx)

```yaml
annotations:
  # Rate Limiting
  nginx.ingress.kubernetes.io/limit-rps: "10"

  # 타임아웃
  nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "30"
  nginx.ingress.kubernetes.io/proxy-read-timeout: "30"

  # 업로드 크기 제한
  nginx.ingress.kubernetes.io/proxy-body-size: "100m"

  # CORS
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
  nginx.ingress.kubernetes.io/cors-allow-origin: "https://example.com"

  # Sticky Session
  nginx.ingress.kubernetes.io/affinity: "cookie"
  nginx.ingress.kubernetes.io/session-cookie-name: "route"

  # 웹소켓
  nginx.ingress.kubernetes.io/websocket-services: "ws-service"
```

---

## 7. NetworkPolicy (Pod 간 트래픽 제어)

### 개념
- L3/L4 수준의 방화벽 규칙
- 기본적으로 모든 Pod는 서로 통신 가능 → NetworkPolicy로 제한
- CNI 플러그인이 NetworkPolicy를 지원해야 함 (Calico, Cilium, Weave 등)

### 기본 패턴 (Namespace 격리)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}  # Namespace 내 모든 Pod
  policyTypes:
  - Ingress
  # ingress: [] 생략 → 모든 Ingress 차단
```

### 특정 Pod만 허용

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-allow-frontend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

**설명**:
- `backend` Pod는 `frontend` Pod로부터만 8080 포트로 Ingress 허용
- 다른 Pod는 차단

### 다른 Namespace에서 접근 허용

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-allow-monitoring
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
      podSelector:
        matchLabels:
          app: prometheus
    ports:
    - protocol: TCP
      port: 9090
```

**설명**:
- `monitoring` Namespace의 `prometheus` Pod만 `backend` Pod의 9090 포트 접근 허용

### Egress 제한 (외부 통신 차단)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53  # DNS 허용
```

**설명**:
- `backend` Pod는 `database` Pod의 5432 포트와 DNS(kube-dns)만 Egress 허용
- 외부 인터넷 접근 차단

### IP 대역 기반 제어

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific-ip
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 192.168.1.0/24
        except:
        - 192.168.1.5/32  # 192.168.1.5는 제외
```

---

## 8. DNS (Service Discovery)

### CoreDNS

Kubernetes는 기본적으로 CoreDNS를 통해 Service 이름을 IP로 변환합니다.

### DNS 레코드 패턴

```bash
# Service
<service-name>.<namespace>.svc.cluster.local

# 예시
backend-service.production.svc.cluster.local

# Pod (Headless Service)
<pod-name>.<service-name>.<namespace>.svc.cluster.local

# 예시
postgres-0.postgres-headless.default.svc.cluster.local
```

### 같은 Namespace 내 생략 가능

```bash
# production Namespace 내 Pod에서
curl http://backend-service/api  # OK
curl http://backend-service.production.svc.cluster.local/api  # 동일
```

### DNS 디버깅

```bash
# dnsutils Pod 실행
kubectl run -it --rm debug --image=gcr.io/kubernetes-e2e-test-images/dnsutils:1.3 --restart=Never -- sh

# nslookup
nslookup backend-service.production.svc.cluster.local

# dig
dig backend-service.production.svc.cluster.local
```

---

## 9. Service Mesh (고급 트래픽 관리)

### 개념
- Istio, Linkerd, Consul Connect 등
- Sidecar Proxy (Envoy)를 통해 트래픽 관찰, 제어, 보안 강화
- 기능: Circuit Breaking, Retry, Timeout, mTLS, Observability

### Istio 예시

#### 트래픽 분할 (Canary Deployment)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-app
spec:
  hosts:
  - web-app
  http:
  - match:
    - headers:
        user-agent:
          regex: ".*Chrome.*"
    route:
    - destination:
        host: web-app
        subset: v2
  - route:
    - destination:
        host: web-app
        subset: v1
      weight: 90
    - destination:
        host: web-app
        subset: v2
      weight: 10  # v2로 10% 트래픽
```

#### DestinationRule (로드밸런싱, Circuit Breaking)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-app
spec:
  host: web-app
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s  # Circuit Breaker
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

---

## 10. 실전 패턴 모음

### 패턴 1: 3-Tier 애플리케이션 네트워킹

```yaml
# Frontend Service (LoadBalancer)
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 3000
---
# Backend Service (ClusterIP)
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 8080
---
# Database Service (ClusterIP)
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  type: ClusterIP
  selector:
    app: postgres
  ports:
  - port: 5432
---
# NetworkPolicy: Frontend → Backend만 허용
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
---
# NetworkPolicy: Backend → Database만 허용
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 5432
```

### 패턴 2: 마이크로서비스 Ingress (다중 호스트)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: microservices-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.com
    - api.example.com
    - admin.example.com
    secretName: microservices-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.example.com
    http:
      paths:
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: users-service
            port:
              number: 80
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: orders-service
            port:
              number: 80
      - path: /payments
        pathType: Prefix
        backend:
          service:
            name: payments-service
            port:
              number: 80
  - host: admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 80
```

---

## 트러블슈팅

### Service Endpoints 없음

```bash
kubectl get endpoints <service-name>

# NAME              ENDPOINTS
# backend-service   <none>

# 원인: Label Selector 불일치
kubectl get pods -l app=backend  # Pod 없음

# 해결: Pod와 Service의 labels 일치 확인
```

### Ingress가 404 반환

```bash
kubectl describe ingress <ingress-name>

# Events:
#   Warning  Sync  nginx-ingress-controller: error while evaluating...

# 원인 1: Service 이름 오타
# 원인 2: Service 포트 불일치
# 원인 3: Ingress Controller 미설치

# 해결: Service와 Ingress의 backend.service.name/port 일치 확인
```

### NetworkPolicy 적용 후 통신 불가

```bash
# NetworkPolicy 확인
kubectl get networkpolicy
kubectl describe networkpolicy <policy-name>

# DNS 통신 확인 (kube-dns Egress 허용 필요)
- to:
  - namespaceSelector:
      matchLabels:
        name: kube-system
    podSelector:
      matchLabels:
        k8s-app: kube-dns
  ports:
  - protocol: UDP
    port: 53
```

---

**마지막 업데이트**: 2026-02-15
